'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { manejador } from '@/lib/comprobantes/registro';
import { consultarAutorizacionYGuardar } from '@/lib/comprobantes/procesar';
import { calcularLinea } from '@/lib/comprobantes/calculos';
import { recalcularFactura } from '@/lib/comprobantes/factura';
import { ESTADO } from '@/lib/constantes';
import { hoyEcuadorISO } from '@/lib/formato';
import { ESTADOS_PROBLEMA, IVA_ANTIGUOS, IVA_VIGENTE } from '@/lib/revision';

export type Resultado = { ok?: boolean; mensaje?: string };

async function comprobante(tipo: number, id: number) {
  const s = await requerirEmisor();
  const m = manejador(tipo);
  const [x] = await sql<{ estado: number; clave: string | null }[]>`
    select estado, ${sql(m.colClave)} clave from ${sql(m.tabla)} where id = ${id} and ${sql(m.colEmisor)} = ${s.emisorId}`;
  if (!x) throw new Error('Comprobante no encontrado');
  return { s, m, x };
}

/** Solo PREGUNTA al SRI si ya está autorizado. No envía nada (regla: nada antiguo se envía). */
export async function consultarSri(_p: Resultado, form: FormData): Promise<Resultado> {
  try {
    const tipo = Number(form.get('tipo')), id = Number(form.get('id'));
    const { s, x } = await comprobante(tipo, id);
    if (!x.clave || x.clave.length !== 49) return { ok: false, mensaje: 'No tiene clave de acceso: nunca llegó al SRI.' };
    const r = await consultarAutorizacionYGuardar(tipo, id, s.emisorId);
    revalidatePath('/revision');
    return { ok: r.estado === ESTADO.AUTORIZADO, mensaje: r.estado === ESTADO.AUTORIZADO ? 'El SRI lo tiene AUTORIZADO: ya quedó como autorizado.' : `Respuesta del SRI: ${r.mensaje}` };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

/** Lo marca anulado en este sistema (no en el SRI) */
export async function anularEnSistema(_p: Resultado, form: FormData): Promise<Resultado> {
  try {
    const tipo = Number(form.get('tipo')), id = Number(form.get('id'));
    const { m, x } = await comprobante(tipo, id);
    if (!ESTADOS_PROBLEMA.includes(x.estado)) return { ok: false, mensaje: 'Este comprobante ya no está en revisión.' };
    await sql.begin(async (tx) => {
      await tx`update ${tx(m.tabla)} set estado = ${ESTADO.ANULADO}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
      // Factura que nunca se autorizó: la venta no ocurrió, se devuelven los productos a la bodega del punto
      if (tipo === 1) {
        await tx`
          update productos_x_bodega x set stock = x.stock + q.cant
          from (select d.id_producto, sum(d.cantidad) cant, max(p.id_bodega) bodega
                from detalle_factura d join factura f on f.id = d.id_factura join puntos_emisior p on p.id = f.id_punto_emison
                where d.id_factura = ${id} group by d.id_producto) q
          where x.id_producto = q.id_producto and x.id_bodega = q.bodega`;
      }
    });
    revalidatePath('/revision');
    return { ok: true, mensaje: tipo === 1 ? 'Anulada en el sistema; los productos volvieron al inventario.' : 'Anulado en el sistema.' };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

/** Borrador (sin número): le pone la fecha de hoy y abre el editor. La persona decide si emite. */
export async function borradorConFechaDeHoy(form: FormData) {
  const id = Number(form.get('id'));
  const s = await requerirEmisor();
  const [f] = await sql<{ estado: number; clave: string | null }[]>`select estado, clave_de_acceso clave from factura where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!f || (f.estado !== ESTADO.PENDIENTE && f.estado !== ESTADO.PAGADO) || (f.clave && f.clave.length === 49)) throw new Error('Solo se puede para borradores sin número');
  await sql`update factura set fecha_emision = ${hoyEcuadorISO()}::timestamp where id = ${id}`;
  redirect(`/facturas/${id}/editar`);
}

/** Copia una factura con problema como borrador NUEVO de hoy (mismo cliente, punto y productos; IVA actual del producto) */
export async function copiarComoNueva(form: FormData) {
  const id = Number(form.get('id'));
  const s = await requerirEmisor();
  const [f] = await sql<{ id_cliente: number; id_punto_emison: number }[]>`
    select id_cliente, id_punto_emison from factura where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!f) throw new Error('Factura no encontrada');
  const lineas = await sql<{ id_producto: number; cantidad: number; precio: number; desc: number; adicional: string | null; iva: number; ice: number; irbpnr: number }[]>`
    select d.id_producto, d.cantidad::float cantidad, d.precio_unitario::float precio, coalesce(d.decuento_porcentaje, 0)::float "desc", d.adicional,
      iva.porcentaje::float iva, ice.porcentaje::float ice, irb.porcentaje::float irbpnr
    from detalle_factura d
    join producto p on p.id = d.id_producto and p.id_emisor = ${s.emisorId}
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where d.id_factura = ${id} order by d.id`;
  const nuevo = await sql.begin(async (tx) => {
    const [n] = await tx<{ id: number }[]>`
      insert into factura (id_emisor, id_cliente, id_punto_emison, fecha_emision, numero, clave_de_acceso, estado, desde_proforma, es_mayorista)
      values (${s.emisorId}, ${f.id_cliente}, ${f.id_punto_emison}, ${hoyEcuadorISO()}::timestamp, '', '', ${ESTADO.PENDIENTE}, false, false)
      returning id`;
    for (const l of lineas) {
      const c = calcularLinea(l.precio, l.cantidad, l.desc, { ivaPct: l.iva, icePct: l.ice, irbpnrPct: l.irbpnr }, false);
      await tx`insert into detalle_factura ${tx({ id_factura: n.id, id_producto: l.id_producto, ...c, adicional: l.adicional })}`;
      await tx`update productos_x_bodega set stock = stock - ${l.cantidad}
        where id_producto = ${l.id_producto} and id_bodega = (select id_bodega from puntos_emisior where id = ${f.id_punto_emison})`;
    }
    return n.id;
  });
  await recalcularFactura(nuevo);
  redirect(`/facturas/${nuevo}/editar`);
}

/** Cambia el IVA antiguo (12 % / 14 %) de un producto, o de todos los de la empresa, a 15 % */
export async function corregirIva(_p: Resultado, form: FormData): Promise<Resultado> {
  const s = await requerirEmisor();
  const id = Number(form.get('id') || 0);
  const r = id
    ? await sql`update producto set codigo_iva = ${IVA_VIGENTE} where id = ${id} and id_emisor = ${s.emisorId} and codigo_iva in ${sql(IVA_ANTIGUOS)}`
    : await sql`update producto set codigo_iva = ${IVA_VIGENTE} where id_emisor = ${s.emisorId} and codigo_iva in ${sql(IVA_ANTIGUOS)}`;
  revalidatePath('/revision');
  return { ok: true, mensaje: `${r.count} producto(s) cambiados a IVA 15 %.` };
}
