'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO } from '@/lib/constantes';

export type Estado = { ok?: boolean; mensaje?: string };

async function borrador(id: number) {
  const s = await requerirEmisor();
  const [g] = await sql<{ id: number; estado: number; fecha_inicio_transporte: Date }[]>`
    select id, estado, fecha_inicio_transporte from guia_remision where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!g) throw new Error('Guía de remisión no encontrada');
  if (g.estado !== ESTADO.PENDIENTE && g.estado !== ESTADO.PAGADO) throw new Error('La guía ya fue finalizada y no se puede modificar');
  return { s, g };
}

function refrescar(id: number) {
  revalidatePath(`/guias-remision/${id}/editar`);
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

async function datosCabecera(emisorId: number, form: FormData) {
  const punto = entero(form.get('id_punto_emision'));
  const transportista = entero(form.get('id_transportista'));
  const inicio = texto(form.get('fecha_inicio_transporte'));
  const fin = texto(form.get('fecha_fin_transporte'));
  const partida = texto(form.get('direccion_partida')).toUpperCase();
  let placa = texto(form.get('placa')).toUpperCase();
  if (!punto) return { error: 'Elija el punto de emisión' };
  if (!transportista) return { error: 'Elija el transportista' };
  if (!FECHA.test(inicio) || !FECHA.test(fin)) return { error: 'Fechas de transporte no válidas' };
  if (fin < inicio) return { error: 'La fecha fin de transporte no puede ser anterior a la de inicio' };
  if (!partida) return { error: 'Ingrese la dirección de partida' };
  const [p] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${emisorId}`;
  if (!p) return { error: 'Punto de emisión no válido' };
  const [t] = await sql<{ placa: string }[]>`select placa from transportistas where id = ${transportista} and id_emisor = ${emisorId}`;
  if (!t) return { error: 'Transportista no válido' };
  if (!placa) placa = t.placa;
  if (!placa) return { error: 'Ingrese la placa del vehículo' };
  return {
    datos: {
      id_punto_emision: punto, id_transportista: transportista, fecha_inicio_transporte: inicio, fecha_fin_transporte: fin,
      direccion_partida: partida.slice(0, 70), placa: placa.slice(0, 20),
    },
  };
}

export async function crearGuia(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const r = await datosCabecera(s.emisorId, form);
  if (!r.datos) return { mensaje: r.error };
  const [g] = await sql<{ id: number }[]>`
    insert into guia_remision ${sql({ ...r.datos, id_emisor: s.emisorId, numero_comprobante: '', clave_acceso: '', estado: ESTADO.PENDIENTE })}
    returning id`;
  redirect(`/guias-remision/${g.id}/editar`);
}

export async function actualizarCabecera(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const r = await datosCabecera(s.emisorId, form);
    if (!r.datos) return { mensaje: r.error };
    await sql`update guia_remision set ${sql(r.datos)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
    refrescar(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarDestinatario(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s, g } = await borrador(id);
    const cliente = entero(form.get('id_cliente'));
    if (!cliente) return { mensaje: 'Elija el destinatario' };
    const [c] = await sql<{ direccion: string | null }[]>`select direccion from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
    if (!c) return { mensaje: 'Destinatario no válido' };
    const motivo = texto(form.get('motivo_traslado')).toUpperCase();
    if (!motivo) return { mensaje: 'Ingrese el motivo del traslado' };
    let numFactura = texto(form.get('numero_factura'));
    let autorizacion = texto(form.get('numero_autorizacion_fac'));
    let fechaFactura = texto(form.get('fecha_emision_factura'));
    let idFacturaSistema: number | null = null;
    if (numFactura) {
      if (/^\d{15}$/.test(numFactura)) numFactura = `${numFactura.slice(0, 3)}-${numFactura.slice(3, 6)}-${numFactura.slice(6)}`;
      if (!/^\d{3}-\d{3}-\d{9}$/.test(numFactura)) return { mensaje: 'El número de factura debe tener el formato 001-001-000000001' };
      // Si la factura existe en el sistema, se completan autorizacion, fecha y productos
      const [f] = await sql<{ id: number; clave_de_acceso: string; fecha_emision: Date }[]>`
        select id, clave_de_acceso, fecha_emision from factura
        where id_emisor = ${s.emisorId} and numero = ${numFactura} and estado <> ${ESTADO.ANULADO}
        order by id desc limit 1`;
      if (f) {
        idFacturaSistema = f.id;
        if (!autorizacion) autorizacion = f.clave_de_acceso;
        if (!fechaFactura) fechaFactura = `${f.fecha_emision.getFullYear()}-${String(f.fecha_emision.getMonth() + 1).padStart(2, '0')}-${String(f.fecha_emision.getDate()).padStart(2, '0')}`;
      }
      if (!autorizacion) return { mensaje: 'Ingrese el número de autorización de la factura' };
      if (!/^\d{10,49}$/.test(autorizacion)) return { mensaje: 'El número de autorización debe tener solo dígitos (10 a 49)' };
      if (!FECHA.test(fechaFactura)) return { mensaje: 'Ingrese la fecha de emisión de la factura' };
    }
    const codEstab = texto(form.get('codigo_estable_destino'));
    if (codEstab && !/^\d{3}$/.test(codEstab)) return { mensaje: 'El código de establecimiento destino debe tener 3 dígitos' };
    const [d] = await sql<{ id: number }[]>`
      insert into guia_remision_destinatario ${sql({
        id_guia: id,
        id_cliente: cliente,
        codigo_estable_destino: codEstab,
        documento_aduanero: texto(form.get('documento_aduanero')).slice(0, 50),
        fecha_emision_factura: fechaFactura || g.fecha_inicio_transporte,
        numero_factura: numFactura,
        numero_autorizacion_fac: autorizacion,
        direccion_destino: (texto(form.get('direccion_destino')).toUpperCase() || (c.direccion ?? '').toUpperCase()).slice(0, 80),
        motivo_traslado: motivo.slice(0, 80),
        ruta: texto(form.get('ruta')).toUpperCase().slice(0, 300),
      })}
      returning id`;
    if (idFacturaSistema && form.get('copiar_productos') === 'on') {
      await sql`
        insert into detalles_guia_remision (id_destinatario, id_producto, cantidad)
        select ${d.id}, id_producto, cantidad from detalle_factura where id_factura = ${idFacturaSistema} order by id`;
    }
    return { ok: true, mensaje: idFacturaSistema ? 'Destinatario agregado con los datos de la factura del sistema' : 'Destinatario agregado' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarDestinatario(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  const dest = Number(form.get('id_destinatario'));
  await sql.begin(async (tx) => {
    await tx`delete from detalles_guia_remision where id_destinatario = ${dest} and id_destinatario in (select id from guia_remision_destinatario where id_guia = ${id})`;
    await tx`delete from guia_remision_destinatario where id = ${dest} and id_guia = ${id}`;
  });
  refrescar(id);
}

export async function agregarProducto(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const dest = entero(form.get('id_destinatario'));
    const prod = entero(form.get('id_producto'));
    const cantidad = decimal(form.get('cantidad')) ?? 0;
    if (!prod) return { mensaje: 'Elija un producto' };
    if (cantidad <= 0 || !Number.isInteger(cantidad)) return { mensaje: 'La cantidad debe ser un entero mayor a cero' };
    const [okD] = await sql`select 1 from guia_remision_destinatario where id = ${dest} and id_guia = ${id}`;
    const [okP] = await sql`select 1 from producto where id = ${prod} and id_emisor = ${s.emisorId}`;
    if (!okD || !okP) return { mensaje: 'Destinatario o producto no válido' };
    await sql`insert into detalles_guia_remision (id_destinatario, id_producto, cantidad) values (${dest}, ${prod}, ${cantidad})`;
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarProducto(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`
    delete from detalles_guia_remision where id = ${Number(form.get('id_detalle'))}
      and id_destinatario in (select id from guia_remision_destinatario where id_guia = ${id})`;
  refrescar(id);
}

export async function agregarAdicional(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const nombre = texto(form.get('nombre'));
    const descripcion = texto(form.get('descripcion'));
    if (!nombre || !descripcion) return { mensaje: 'Complete nombre y descripción' };
    await sql`insert into datos_adicionales_guia_remision (id_guia, nombre, descripcion) values (${id}, ${nombre.slice(0, 50)}, ${descripcion.slice(0, 300)})`;
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarAdicional(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from datos_adicionales_guia_remision where id = ${Number(form.get('id_adicional'))} and id_guia = ${id}`;
  refrescar(id);
}

export async function eliminarBorrador(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql.begin(async (tx) => {
    await tx`delete from detalles_guia_remision where id_destinatario in (select id from guia_remision_destinatario where id_guia = ${id})`;
    await tx`delete from guia_remision_destinatario where id_guia = ${id}`;
    await tx`delete from datos_adicionales_guia_remision where id_guia = ${id}`;
    await tx`delete from guia_remision where id = ${id}`;
  });
  revalidatePath('/guias-remision');
  redirect('/guias-remision');
}

export async function emitirGuia(_p: Estado, form: FormData): Promise<Estado> {
  const id = Number(form.get('id'));
  let destino: string | null = null;
  try {
    const { s } = await borrador(id);
    const [r] = await sql<{ destinatarios: number; sin_productos: number }[]>`
      select count(*) destinatarios,
             count(*) filter (where not exists (select 1 from detalles_guia_remision x where x.id_destinatario = d.id)) sin_productos
      from guia_remision_destinatario d where d.id_guia = ${id}`;
    if (!r.destinatarios) return { mensaje: 'Agregue al menos un destinatario' };
    if (r.sin_productos) return { mensaje: 'Cada destinatario debe tener al menos un producto' };
    const res = await emitir(5, id, s.emisorId);
    revalidatePath('/guias-remision');
    if (res.estado > 0) destino = `/guias-remision/${id}`;
    if (!destino) return { mensaje: res.mensaje };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
