import 'server-only';
import { sql } from '@/lib/db';
import { calcularLinea, NO_OBJETO_IVA, EXENTO_IVA } from '@/lib/comprobantes/calculos';
import { recalcularFactura } from '@/lib/comprobantes/factura';
import { ESTADO } from '@/lib/constantes';

/** Configuracion de un documento comercial con lineas (proforma o pedido) */
export type DocLineas = {
  tabla: 'proforma' | 'pedido';
  detalle: 'detalle_proforma' | 'detalle_pedido';
  fk: 'id_proforma' | 'id_pedido';
  colPrecio: 'precio' | 'precio_unitario';
  colDescPct: 'descuento_porcentaje' | 'decuento_porcentaje';
  colSubtotal: 'subtotal_sin_impuesto' | 'subtotal_sin_impuestos';
  tieneFechaModificacion: boolean;
};

export const PROFORMA: DocLineas = {
  tabla: 'proforma', detalle: 'detalle_proforma', fk: 'id_proforma', colPrecio: 'precio',
  colDescPct: 'descuento_porcentaje', colSubtotal: 'subtotal_sin_impuesto', tieneFechaModificacion: false,
};
export const PEDIDO: DocLineas = {
  tabla: 'pedido', detalle: 'detalle_pedido', fk: 'id_pedido', colPrecio: 'precio_unitario',
  colDescPct: 'decuento_porcentaje', colSubtotal: 'subtotal_sin_impuestos', tieneFechaModificacion: true,
};

async function impuestosProducto(idProducto: number, emisorId: number) {
  const [p] = await sql<{ precio: number; iva: number; ice: number; irbpnr: number }[]>`
    select p.precio, iva.porcentaje iva, ice.porcentaje ice, irb.porcentaje irbpnr
    from producto p
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where p.id = ${idProducto} and p.id_emisor = ${emisorId}`;
  if (!p) throw new Error('Producto no encontrado');
  return { precio: Number(p.precio), imp: { ivaPct: Number(p.iva), icePct: Number(p.ice), irbpnrPct: Number(p.irbpnr) } };
}

function filaDetalle(c: DocLineas, l: ReturnType<typeof calcularLinea>) {
  return {
    [c.colPrecio]: l.precio_unitario,
    cantidad: l.cantidad,
    descuento: l.descuento,
    [c.colDescPct]: l.decuento_porcentaje,
    sub_total: l.sub_total,
    valor_iva: l.valor_iva,
    valor_ice: l.valor_ice,
    valor_irbpnr: l.valor_irbpnr,
    total: l.total,
  };
}

export async function agregarLineaDoc(c: DocLineas, docId: number, emisorId: number, idProducto: number, cantidad: number, precioConIva: number | null, descPct: number, adicional: string | null) {
  if (cantidad <= 0 || !Number.isInteger(cantidad)) throw new Error('La cantidad debe ser un entero mayor a cero');
  if (descPct < 0 || descPct > 100) throw new Error('Descuento entre 0 y 100%');
  const p = await impuestosProducto(idProducto, emisorId);
  const l = precioConIva != null ? calcularLinea(precioConIva, cantidad, descPct, p.imp, true) : calcularLinea(p.precio, cantidad, descPct, p.imp, false);
  await sql`insert into ${sql(c.detalle)} ${sql({ [c.fk]: docId, id_producto: idProducto, ...filaDetalle(c, l), adicional: adicional || null })}`;
  await recalcularDoc(c, docId);
}

export async function actualizarLineaDoc(c: DocLineas, docId: number, idLinea: number, cantidad: number, precioConIva: number, descPct: number, adicional: string | null) {
  if (cantidad <= 0 || !Number.isInteger(cantidad)) throw new Error('Cantidad no válida');
  if (precioConIva < 0) throw new Error('Precio no válido');
  const [d] = await sql<{ iva: number; ice: number; irbpnr: number }[]>`
    select iva.porcentaje iva, ice.porcentaje ice, irb.porcentaje irbpnr
    from ${sql(c.detalle)} d join producto p on p.id = d.id_producto
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where d.id = ${idLinea} and d.${sql(c.fk)} = ${docId}`;
  if (!d) throw new Error('Línea no encontrada');
  const l = calcularLinea(precioConIva, cantidad, descPct, { ivaPct: Number(d.iva), icePct: Number(d.ice), irbpnrPct: Number(d.irbpnr) }, true);
  await sql`update ${sql(c.detalle)} set ${sql({ ...filaDetalle(c, l), adicional: adicional || null })} where id = ${idLinea}`;
  await recalcularDoc(c, docId);
}

export async function eliminarLineaDoc(c: DocLineas, docId: number, idLinea: number) {
  await sql`delete from ${sql(c.detalle)} where id = ${idLinea} and ${sql(c.fk)} = ${docId}`;
  await recalcularDoc(c, docId);
}

/** Recalcula totales (misma regla que la factura) */
export async function recalcularDoc(c: DocLineas, docId: number) {
  await sql`
    with t as (
      select
        coalesce(sum(d.sub_total), 0) sub,
        coalesce(sum(d.sub_total) filter (where d.valor_iva > 0), 0) sub_iva,
        coalesce(sum(d.sub_total) filter (where d.valor_iva = 0 and p.codigo_iva not in (${NO_OBJETO_IVA}, ${EXENTO_IVA})), 0) sub_cero,
        coalesce(sum(d.sub_total) filter (where d.valor_iva = 0 and p.codigo_iva = ${NO_OBJETO_IVA}), 0) sub_no_obj,
        coalesce(sum(d.sub_total) filter (where d.valor_iva = 0 and p.codigo_iva = ${EXENTO_IVA}), 0) sub_exento,
        coalesce(sum(d.sub_total) filter (where d.valor_ice > 0), 0) sub_ice,
        coalesce(sum(d.sub_total) filter (where d.valor_irbpnr > 0), 0) sub_irbpnr,
        coalesce(sum(d.valor_iva), 0) iva, coalesce(sum(d.valor_ice), 0) ice, coalesce(sum(d.valor_irbpnr), 0) irbpnr,
        coalesce(sum(d.descuento), 0) descuento, coalesce(sum(d.total), 0) total
      from ${sql(c.detalle)} d join producto p on p.id = d.id_producto
      where d.${sql(c.fk)} = ${docId}
    )
    update ${sql(c.tabla)} x set
      ${sql(c.colSubtotal)} = t.sub, subtotal_iva = t.sub_iva, subtotal_iva_cero = t.sub_cero,
      subtotal_no_objeto_iva = t.sub_no_obj, subtotal_excento_iva = t.sub_exento, subtotal_ice = t.sub_ice,
      subtotal_irbpnr = t.sub_irbpnr, valor_iva = t.iva, valor_ice = t.ice, valor_irbpnr = t.irbpnr,
      total_descuento = t.descuento, total = t.total
      ${c.tieneFechaModificacion ? sql`, fecha_modificacion = now() at time zone 'America/Guayaquil'` : sql``}
    from t where x.id = ${docId}`;
}

export type LineaDoc = {
  id: number; id_producto: number; codigo: string; nombre: string; adicional: string | null; cantidad: number;
  precio_unitario: number; descuento: number; descuento_pct: number; sub_total: number; valor_iva: number; total: number; iva_pct: number;
};

export async function lineasDoc(c: DocLineas, docId: number) {
  return sql<LineaDoc[]>`
    select d.id, d.id_producto, p.codigo, p.nombre, d.adicional, d.cantidad, d.${sql(c.colPrecio)} precio_unitario,
           d.descuento, d.${sql(c.colDescPct)} descuento_pct, d.sub_total, d.valor_iva, d.total, iva.porcentaje iva_pct
    from ${sql(c.detalle)} d join producto p on p.id = d.id_producto
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    where d.${sql(c.fk)} = ${docId} order by d.id`;
}

/**
 * Crea un borrador de factura con las lineas del documento (igual que ImportarDesdeProforma/Pedido).
 * Descuenta el stock en la bodega del punto de emision, como al agregar lineas a una factura.
 */
export async function convertirAFactura(c: DocLineas, docId: number, emisorId: number, idPunto: number): Promise<number> {
  const [doc] = await sql<{ id_cliente: number }[]>`select id_cliente from ${sql(c.tabla)} where id = ${docId} and id_emisor = ${emisorId}`;
  if (!doc) throw new Error('Documento no encontrado');
  const [okPunto] = await sql<{ id_bodega: number }[]>`select id_bodega from puntos_emisior where id = ${idPunto} and id_emisor = ${emisorId}`;
  if (!okPunto) throw new Error('Punto de emisión no válido');
  const lineas = await lineasDoc(c, docId);
  if (!lineas.length) throw new Error('El documento no tiene productos');
  const idFactura = await sql.begin(async (tx) => {
    const [f] = await tx<{ id: number }[]>`
      insert into factura (id_emisor, id_cliente, id_punto_emison, fecha_emision, numero, clave_de_acceso, estado, desde_proforma, es_mayorista)
      values (${emisorId}, ${doc.id_cliente}, ${idPunto}, date_trunc('day', now() at time zone 'America/Guayaquil'), '', '', ${ESTADO.PENDIENTE}, true, false)
      returning id`;
    for (const l of lineas) {
      await tx`
        insert into detalle_factura (id_factura, id_producto, precio_unitario, cantidad, descuento, decuento_porcentaje, sub_total, valor_iva, valor_ice, valor_irbpnr, total, adicional)
        select ${f.id}, d.id_producto, d.${tx(c.colPrecio)}, d.cantidad, d.descuento, d.${tx(c.colDescPct)}, d.sub_total, d.valor_iva, d.valor_ice, d.valor_irbpnr, d.total, d.adicional
        from ${tx(c.detalle)} d where d.id = ${l.id}`;
      await tx`update productos_x_bodega set stock = stock - ${l.cantidad} where id_producto = ${l.id_producto} and id_bodega = ${okPunto.id_bodega}`;
    }
    return f.id;
  });
  await recalcularFactura(idFactura);
  return idFactura;
}
