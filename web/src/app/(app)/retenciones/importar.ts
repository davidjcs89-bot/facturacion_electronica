'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { r2 } from '@/lib/comprobantes/calculos';
import { consultarAutorizacion, type Ambiente } from '@/lib/sri/ws';
import { hoyEcuadorISO } from '@/lib/formato';
import { leerComprobante, type DatosFactura } from '@/lib/sri/leerComprobante';
import { ESTADO } from '@/lib/constantes';

export type EstadoImportar = { mensaje?: string };

const TIPO_CLIENTE_SUJETO_RETENCION = 2;
const TIPO_IDENTIFICACION_RUC = 1;

/**
 * Copia una retencion existente (sujeto, punto, documentos sustento, impuestos y datos adicionales) a un borrador
 * nuevo con fecha de hoy. Los codigos de porcentaje fijo toman el porcentaje vigente del catalogo.
 */
export async function copiarRetencion(_p: EstadoImportar, form: FormData): Promise<EstadoImportar> {
  const s = await requerirEmisor();
  const origen = entero(form.get('id_origen'));
  if (!origen) return { mensaje: 'Elija la retención que quiere copiar' };
  const [r] = await sql<{ id_cliente: number | null; id_punto_emision: number }[]>`
    select id_cliente, id_punto_emision from retencion where id = ${origen} and id_emisor = ${s.emisorId}`;
  if (!r) return { mensaje: 'Retención no encontrada' };
  const hoy = hoyEcuadorISO();
  const nuevoId = await sql.begin(async (tx) => {
    const [n] = await tx<{ id: number }[]>`
      insert into retencion (id_emisor, id_cliente, id_punto_emision, fecha_emision, numero, clave_acceso, estado)
      values (${s.emisorId}, ${r.id_cliente}, ${r.id_punto_emision}, ${hoy}::timestamp, '', '', ${ESTADO.PENDIENTE})
      returning id`;
    const detalles = await tx<{
      id_tipo_documento: number; numero_documento_ret: string; fecha_emision: Date; id_impuesto: number; id_porcentajes_retenccion: number;
      base_imponible: number; porcentaje_retencion: number; periodo_fiscal: string; pct_vigente: number | null; fijo: boolean | null;
    }[]>`
      select d.id_tipo_documento, d.numero_documento_ret, d.fecha_emision, d.id_impuesto, d.id_porcentajes_retenccion,
             d.base_imponible, d.porcentaje_retencion, d.periodo_fiscal, p.porcentaje pct_vigente, p.porcentaje_fijo fijo
      from detalle_retencion d left join impuesto_porcentaje_retencion p on p.id = d.id_porcentajes_retenccion
      where d.id_retencion = ${origen} order by d.id`;
    for (const d of detalles) {
      const pct = d.fijo && d.pct_vigente != null ? Number(d.pct_vigente) : Number(d.porcentaje_retencion);
      const base = Number(d.base_imponible);
      await tx`
        insert into detalle_retencion ${tx({
          id_retencion: n.id,
          id_tipo_documento: d.id_tipo_documento,
          numero_documento_ret: d.numero_documento_ret,
          fecha_emision: d.fecha_emision,
          id_impuesto: d.id_impuesto,
          id_porcentajes_retenccion: d.id_porcentajes_retenccion,
          base_imponible: base,
          porcentaje_retencion: pct,
          valor_retenido: r2(base * (pct / 100)),
          periodo_fiscal: d.periodo_fiscal,
        })}`;
    }
    await tx`
      insert into datos_adicionales_retencion (id_retencion, nombre, descripcion)
      select ${n.id}, nombre, descripcion from datos_adicionales_retencion where id_retencion = ${origen}`;
    return n.id;
  });
  revalidatePath('/retenciones');
  redirect(`/retenciones/${nuevoId}/editar?copiada=${origen}`);
}

/**
 * Crea un borrador de retencion a partir de la factura del proveedor: por clave de acceso (se descarga del SRI)
 * o subiendo su XML. Crea el proveedor como sujeto retenido si no existe y deja propuestos documento y bases.
 */
export async function importarFacturaProveedor(_p: EstadoImportar, form: FormData): Promise<EstadoImportar> {
  const s = await requerirEmisor();
  let datos: DatosFactura;
  try {
    const clave = texto(form.get('clave')).replace(/\D/g, '');
    const archivo = form.get('xml');
    if (clave) {
      if (clave.length !== 49) return { mensaje: 'La clave de acceso debe tener 49 dígitos' };
      const ambiente = clave[23] === '2' ? '2' : '1';
      const r = await consultarAutorizacion(ambiente as Ambiente, clave);
      if (r.estado !== 'AUTORIZADO' || !r.comprobante) {
        return { mensaje: `El SRI no tiene esa factura como AUTORIZADA (${r.estado || 'sin respuesta'}). Revise la clave o suba el XML.` };
      }
      datos = leerComprobante(r.comprobante);
    } else if (archivo instanceof File && archivo.size > 0) {
      if (archivo.size > 900_000) return { mensaje: 'El archivo es demasiado grande' };
      datos = leerComprobante(await archivo.text());
    } else {
      return { mensaje: 'Pegue la clave de acceso o elija el archivo XML de la factura' };
    }
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  if (!/^\d{13}$/.test(datos.ruc)) return { mensaje: 'El XML no tiene un RUC de proveedor válido' };
  if (!/^\d{15}$/.test(datos.numero)) return { mensaje: 'El XML no tiene un número de documento válido' };

  const [em] = await sql<{ ruc: string }[]>`select ruc from emisor where id = ${s.emisorId}`;
  if (datos.comprador && em?.ruc && datos.comprador !== em.ruc) {
    return { mensaje: `Esa factura no está a nombre de su empresa: el comprador es ${datos.comprador} y su RUC es ${em.ruc}.` };
  }
  if (datos.ruc === em?.ruc) return { mensaje: 'Esa factura la emitió su propia empresa: la retención se hace a facturas de proveedores.' };

  const punto = entero(form.get('id_punto_emision'));
  const [okPunto] = punto ? await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}` : [];
  if (!okPunto) return { mensaje: 'Elija el punto de emisión' };

  // Proveedor como sujeto retenido: se busca por RUC; si no existe se crea con los datos del XML
  let [prov] = await sql<{ id: number }[]>`
    select id from clientes
    where id_emisor = ${s.emisorId} and identificacion = ${datos.ruc} and tipo_cliente = ${TIPO_CLIENTE_SUJETO_RETENCION}
    order by id limit 1`;
  if (!prov) {
    // Si ya existe con otro tipo (cliente/proveedor) se copian su correo y telefonos
    const [otro] = await sql<{ correo: string | null; telefono_movil: string | null; telefono_fijo: string | null; direccion: string | null }[]>`
      select correo, telefono_movil, telefono_fijo, direccion from clientes
      where id_emisor = ${s.emisorId} and identificacion = ${datos.ruc} order by id limit 1`;
    [prov] = await sql<{ id: number }[]>`
      insert into clientes ${sql({
        id_emisor: s.emisorId,
        nombre_cliente: datos.razonSocial.slice(0, 200),
        tipo_identificacion: TIPO_IDENTIFICACION_RUC,
        tipo_cliente: TIPO_CLIENTE_SUJETO_RETENCION,
        identificacion: datos.ruc,
        direccion: (otro?.direccion ?? datos.direccion)?.slice(0, 200) ?? null,
        correo: otro?.correo ?? null,
        telefono_movil: otro?.telefono_movil ?? null,
        telefono_fijo: otro?.telefono_fijo ?? null,
      })}
      returning id`;
  }

  const [r] = await sql<{ id: number }[]>`
    insert into retencion (id_emisor, id_cliente, id_punto_emision, fecha_emision, numero, clave_acceso, estado)
    values (${s.emisorId}, ${prov.id}, ${punto}, ${hoyEcuadorISO()}::timestamp, '', '', ${ESTADO.PENDIENTE})
    returning id`;
  revalidatePath('/retenciones');
  const q = new URLSearchParams({
    doc: datos.codDoc, num: datos.numero, fecha: datos.fecha, renta: datos.baseRenta.toFixed(2), iva: datos.ivaValor.toFixed(2),
  });
  redirect(`/retenciones/${r.id}/editar?${q.toString()}`);
}
