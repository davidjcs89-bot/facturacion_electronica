import 'server-only';
import { sql } from '../db';
import { manejador } from './registro';
import { generarClaveAcceso } from '../sri/clave';
import { leerCertificado, firmarComprobante } from '../sri/firma';
import { enviarComprobante, consultarAutorizacion, textoMensajes, type Ambiente } from '../sri/ws';
import { generarRide } from '../sri/ride';
import { descifrar } from '../cifrado';
import { enviarCorreo, registrarLog } from '../correo';
import { ESTADO } from '../constantes';
import { money } from '../formato';

export type ResultadoEmision = { ok: boolean; estado: number; mensaje: string };

/**
 * La emision real esta bloqueada mientras la app anterior siga emitiendo (comparten secuenciales).
 * Se permite siempre en ambiente de PRUEBAS.
 */
export async function emisionPermitida(emisorId: number): Promise<{ permitido: boolean; motivo?: string; ambiente: Ambiente }> {
  const [e] = await sql<{ codigo_ambiente: string }[]>`
    select a.codigo_ambiente from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente where e.id = ${emisorId}`;
  const ambiente = (e?.codigo_ambiente === '2' ? '2' : '1') as Ambiente;
  if (ambiente === '1') return { permitido: true, ambiente };
  if (process.env.EMISION_HABILITADA === 'true') return { permitido: true, ambiente };
  return {
    permitido: false,
    ambiente,
    motivo:
      'La emisión en PRODUCCIÓN está desactivada en esta app mientras el sistema anterior siga emitiendo (comparten la numeración). Se activa al hacer el cambio definitivo.',
  };
}

/** Asigna numero (secuencial del punto de emision) y clave de acceso si aun no los tiene. */
export async function asignarNumeracion(tipoDoc: number, id: number, emisorId: number) {
  const m = manejador(tipoDoc);
  await sql.begin(async (tx) => {
    const [doc] = await tx<{ numero: string | null; clave: string | null; punto: number; fecha: Date }[]>`
      select ${tx(m.colNumero)} numero, ${tx(m.colClave)} clave, ${tx(m.colPunto)} punto, ${tx(m.colFecha)} fecha
      from ${tx(m.tabla)} where id = ${id} and ${tx(m.colEmisor)} = ${emisorId} for update`;
    if (!doc) throw new Error('Comprobante no encontrado');
    if (doc.numero && doc.clave && doc.clave.length === 49) return;
    let numero = doc.numero;
    if (!numero) {
      const [sec] = await tx<{ id: number; secuencial: number; estab: string; pto: string }[]>`
        select s.id, s.secuencial, p.numero_establecimiento estab, p.numero_emision pto
        from secuencias s join puntos_emisior p on p.id = s.id_punto_emision
        where s.id_punto_emision = ${doc.punto} and s.id_documentos = ${tipoDoc}
        for update of s`;
      if (!sec) throw new Error('El punto de emisión no tiene secuencial configurado para este tipo de comprobante');
      numero = `${sec.estab.padStart(3, '0')}-${sec.pto.padStart(3, '0')}-${String(sec.secuencial).padStart(9, '0')}`;
      await tx`update secuencias set secuencial = secuencial + 1 where id = ${sec.id}`;
    }
    const [e] = await tx<{ ruc: string; codigo_ambiente: string }[]>`
      select e.ruc, a.codigo_ambiente from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente where e.id = ${emisorId}`;
    const clave = generarClaveAcceso({ fecha: doc.fecha, codDoc: m.codDoc, ruc: e.ruc, ambiente: e.codigo_ambiente, numero });
    await tx`
      update ${tx(m.tabla)} set ${tx(m.colNumero)} = ${numero}, ${tx(m.colClave)} = ${clave},
        estado = ${ESTADO.FINALIZADO}, fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id}`;
  });
}

async function cargarFirma(emisorId: number) {
  const [f] = await sql<{ archivo: Uint8Array; clave_cifrada: string; valido_hasta: Date | null }[]>`
    select archivo, clave_cifrada, valido_hasta from firma_emisor where id_emisor = ${emisorId}`;
  if (!f) throw new Error('El emisor no tiene firma electrónica cargada (Configuración → Emisor y firma)');
  if (f.valido_hasta && f.valido_hasta < new Date()) throw new Error('La firma electrónica del emisor está vencida');
  return leerCertificado(f.archivo, descifrar(f.clave_cifrada));
}

async function guardarDocumento(tipoDoc: number, id: number, campos: Record<string, unknown>) {
  const [doc] = await sql<{ id: number }[]>`
    select id from documentos_electronicos where id_tipo_comprobante = ${tipoDoc} and id_comprobante = ${id}
    order by id desc limit 1`;
  if (doc) {
    await sql`update documentos_electronicos set ${sql(campos)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${doc.id}`;
    return doc.id;
  }
  const [n] = await sql<{ id: number }[]>`
    insert into documentos_electronicos ${sql({ id_comprobante: id, id_tipo_comprobante: tipoDoc, valido: false, ...campos })}
    returning id`;
  return n.id;
}

async function cambiarEstado(tipoDoc: number, id: number, estado: number, fechaAut?: string) {
  const m = manejador(tipoDoc);
  if (fechaAut) {
    await sql`update ${sql(m.tabla)} set estado = ${estado}, fecha_autorizacion = ${fechaAut.slice(0, 19).replace('T', ' ')}::timestamp,
      fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
  } else {
    await sql`update ${sql(m.tabla)} set estado = ${estado}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Emision completa: numeracion -> XML -> firma -> envio al SRI -> autorizacion -> RIDE -> correo.
 * Si el SRI deja el comprobante "en proceso", queda en estado RECIBIDO para consultarlo despues.
 */
export async function emitir(tipoDoc: number, id: number, emisorId: number): Promise<ResultadoEmision> {
  const m = manejador(tipoDoc);
  const perm = await emisionPermitida(emisorId);
  if (!perm.permitido) return { ok: false, estado: 0, mensaje: perm.motivo! };

  // La firma se valida antes de consumir un secuencial
  let cert: Awaited<ReturnType<typeof cargarFirma>>;
  try {
    cert = await cargarFirma(emisorId);
  } catch (e) {
    return { ok: false, estado: 0, mensaje: (e as Error).message };
  }
  try {
    await asignarNumeracion(tipoDoc, id, emisorId);
  } catch (e) {
    return { ok: false, estado: 0, mensaje: (e as Error).message };
  }

  const [doc] = await sql<{ clave: string; estado: number }[]>`
    select ${sql(m.colClave)} clave, estado from ${sql(m.tabla)} where id = ${id}`;
  if (doc.estado === ESTADO.AUTORIZADO) return { ok: true, estado: ESTADO.AUTORIZADO, mensaje: 'El comprobante ya está autorizado' };
  if (doc.estado === ESTADO.ANULADO) return { ok: false, estado: ESTADO.ANULADO, mensaje: 'El comprobante está anulado' };

  let xmlFirmado: string;
  try {
    const xml = await m.construirXml(id);
    xmlFirmado = firmarComprobante(xml, cert);
    await guardarDocumento(tipoDoc, id, { xml_generado: xml, xml_firmado: xmlFirmado, mensajes: null });
  } catch (e) {
    const msg = (e as Error).message;
    await guardarDocumento(tipoDoc, id, { xml_generado: '<error/>', mensajes: msg }).catch(() => undefined);
    return { ok: false, estado: ESTADO.FINALIZADO, mensaje: msg };
  }

  // Envio
  try {
    const r = await enviarComprobante(perm.ambiente, xmlFirmado);
    if (r.estado !== 'RECIBIDA' && !r.yaRegistrada) {
      const msg = textoMensajes(r.mensajes) || `El SRI devolvió el comprobante (${r.estado})`;
      await guardarDocumento(tipoDoc, id, { mensajes: msg });
      await cambiarEstado(tipoDoc, id, ESTADO.NO_RECIBIDO);
      return { ok: false, estado: ESTADO.NO_RECIBIDO, mensaje: msg };
    }
    await cambiarEstado(tipoDoc, id, ESTADO.RECIBIDO);
  } catch (e) {
    const msg = `No se pudo enviar al SRI: ${(e as Error).message}`;
    await guardarDocumento(tipoDoc, id, { mensajes: msg });
    await encolar(tipoDoc, id);
    return { ok: false, estado: ESTADO.FINALIZADO, mensaje: msg + '. Se reintentará con "Consultar SRI".' };
  }

  // Autorizacion (el SRI suele tardar unos segundos)
  for (let intento = 0; intento < 4; intento++) {
    await espera(intento === 0 ? 2500 : 3000);
    const r = await consultarAutorizacionYGuardar(tipoDoc, id, emisorId);
    if (r.estado !== ESTADO.RECIBIDO) return r;
  }
  await encolar(tipoDoc, id);
  return { ok: true, estado: ESTADO.RECIBIDO, mensaje: 'Recibido por el SRI; la autorización aún está en proceso. Consulte en unos minutos.' };
}

async function encolar(tipoDoc: number, id: number) {
  const [d] = await sql<{ id: number }[]>`
    select id from documentos_electronicos where id_tipo_comprobante = ${tipoDoc} and id_comprobante = ${id} order by id desc limit 1`;
  if (!d) return;
  await sql`
    insert into cola_envio_comprobantes (id_comprobante, id_tipo_comprobante, id_documento_electronico)
    select ${id}, ${tipoDoc}, ${d.id}
    where not exists (select 1 from cola_envio_comprobantes where id_comprobante = ${id} and id_tipo_comprobante = ${tipoDoc})`;
}

async function desencolar(tipoDoc: number, id: number) {
  await sql`delete from cola_envio_comprobantes where id_comprobante = ${id} and id_tipo_comprobante = ${tipoDoc}`;
}

/** Consulta la autorizacion en el SRI y actualiza estado, XML autorizado y RIDE. */
export async function consultarAutorizacionYGuardar(tipoDoc: number, id: number, emisorId: number): Promise<ResultadoEmision> {
  const m = manejador(tipoDoc);
  const [doc] = await sql<{ clave: string; estado: number }[]>`
    select ${sql(m.colClave)} clave, estado from ${sql(m.tabla)} where id = ${id} and ${sql(m.colEmisor)} = ${emisorId}`;
  if (!doc?.clave || doc.clave.length !== 49) return { ok: false, estado: doc?.estado ?? 0, mensaje: 'El comprobante no tiene clave de acceso' };
  const ambiente = doc.clave.charAt(23) as Ambiente;
  const r = await consultarAutorizacion(ambiente, doc.clave);
  if (r.estado === 'AUTORIZADO') {
    const ride = await generarRide(await m.modeloRide(id, { numeroAutorizacion: r.numeroAutorizacion, fechaAutorizacion: r.fechaAutorizacion }));
    await guardarDocumento(tipoDoc, id, {
      xml_retornado: r.xmlAutorizacion ?? null,
      ride: Buffer.from(ride),
      valido: true,
      mensajes: null,
    });
    await cambiarEstado(tipoDoc, id, ESTADO.AUTORIZADO, r.fechaAutorizacion);
    await desencolar(tipoDoc, id);
    const correo = await enviarAlReceptor(tipoDoc, id).catch((e) => (e as Error).message);
    return {
      ok: true,
      estado: ESTADO.AUTORIZADO,
      mensaje: `Autorizado por el SRI.${correo ? ` (No se pudo enviar el correo: ${correo})` : ' Se envió el correo al cliente.'}`,
    };
  }
  if (r.estado === 'NO AUTORIZADO') {
    const msg = textoMensajes(r.mensajes) || 'No autorizado por el SRI';
    await guardarDocumento(tipoDoc, id, { mensajes: msg });
    await cambiarEstado(tipoDoc, id, ESTADO.NO_AUTORIZADO);
    await desencolar(tipoDoc, id);
    return { ok: false, estado: ESTADO.NO_AUTORIZADO, mensaje: msg };
  }
  if (r.estado === 'SIN RESPUESTA' && doc.estado !== ESTADO.RECIBIDO) {
    return { ok: false, estado: doc.estado, mensaje: 'El SRI no tiene registrado este comprobante. Envíelo nuevamente.' };
  }
  return { ok: true, estado: ESTADO.RECIBIDO, mensaje: 'La autorización está en proceso en el SRI.' };
}

/** Envia RIDE y XML autorizado al correo del receptor */
export async function enviarAlReceptor(tipoDoc: number, id: number, destinoManual?: string): Promise<string | null> {
  const m = manejador(tipoDoc);
  const datos = await m.datosCorreo(id);
  const destino = destinoManual || datos.correo;
  if (!destino) return 'El receptor no tiene correo registrado';
  const [d] = await sql<{ xml_retornado: string | null; ride: Uint8Array | null }[]>`
    select xml_retornado::text, ride from documentos_electronicos
    where id_tipo_comprobante = ${tipoDoc} and id_comprobante = ${id} and ride is not null order by id desc limit 1`;
  if (!d?.ride) return 'El comprobante no está autorizado';
  const [e] = await sql<{ nombre_comercial: string; razon_social: string; clave: string }[]>`
    select e.nombre_comercial, e.razon_social, x.${sql(m.colClave)} clave
    from ${sql(m.tabla)} x join emisor e on e.id = x.${sql(m.colEmisor)} where x.id = ${id}`;
  const asunto = `${e.nombre_comercial} ${m.nombre} #${datos.numero}`;
  const html =
    `<p>Te saluda ${e.nombre_comercial}.</p><p>Estimado(a) ${datos.receptor}</p>` +
    `<p>Ha recibido un documento electrónico (${m.nombre} ${datos.numero}) a través de este medio.</p>` +
    `<p>Adjunto encontrará el RIDE en PDF y el archivo XML autorizado por el SRI.</p>` +
    (datos.total != null ? `<p>Valor total: $${money(datos.total)}</p>` : '') +
    `<p>Atentamente,</p><p>${e.razon_social}</p>`;
  const err = await enviarCorreo(destino, asunto, html, [
    { nombre: `${e.clave}.pdf`, contenido: d.ride, tipo: 'application/pdf' },
    ...(d.xml_retornado ? [{ nombre: `${e.clave}.xml`, contenido: d.xml_retornado, tipo: 'application/xml' }] : []),
  ]);
  if (err) await registrarLog(`Correo ${m.nombre} ${id}: ${err}`);
  return err;
}

/** Procesa la cola de comprobantes pendientes de autorizacion (para el cron diario y el boton manual) */
export async function procesarCola(limite = 25) {
  const pendientes = await sql<{ id_comprobante: number; id_tipo_comprobante: number }[]>`
    select id_comprobante, id_tipo_comprobante from cola_envio_comprobantes order by id_documento_electronico limit ${limite}`;
  const resultados: string[] = [];
  for (const p of pendientes) {
    try {
      const m = manejador(p.id_tipo_comprobante);
      const [x] = await sql<{ emisor: number }[]>`select ${sql(m.colEmisor)} emisor from ${sql(m.tabla)} where id = ${p.id_comprobante}`;
      if (!x) {
        await desencolar(p.id_tipo_comprobante, p.id_comprobante);
        continue;
      }
      const r = await consultarAutorizacionYGuardar(p.id_tipo_comprobante, p.id_comprobante, x.emisor);
      resultados.push(`${m.nombre} ${p.id_comprobante}: ${r.mensaje}`);
    } catch (e) {
      resultados.push(`${p.id_tipo_comprobante}/${p.id_comprobante}: ${(e as Error).message}`);
    }
  }
  return resultados;
}

/** RIDE en PDF: el guardado si esta autorizado; si no, uno generado al vuelo (sin autorizacion) */
export async function obtenerRide(tipoDoc: number, id: number): Promise<Uint8Array> {
  const [d] = await sql<{ ride: Uint8Array | null }[]>`
    select ride from documentos_electronicos where id_tipo_comprobante = ${tipoDoc} and id_comprobante = ${id} and ride is not null
    order by id desc limit 1`;
  if (d?.ride) return d.ride;
  const m = manejador(tipoDoc);
  return generarRide(await m.modeloRide(id, {}));
}
