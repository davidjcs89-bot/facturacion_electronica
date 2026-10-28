'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { calcularLinea } from '@/lib/comprobantes/calculos';
import { recalcularLiquidacion } from '@/lib/comprobantes/liquidacion_compra';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO } from '@/lib/constantes';

export type Estado = { ok?: boolean; mensaje?: string };

/** Verifica que la liquidacion sea del emisor y siga en borrador */
async function borrador(id: number) {
  const s = await requerirEmisor();
  const [f] = await sql<{ id: number; estado: number; id_punto_emison: number }[]>`
    select id, estado, id_punto_emison from liquidacion_compra where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!f) throw new Error('Liquidación no encontrada');
  if (f.estado !== ESTADO.PENDIENTE && f.estado !== ESTADO.PAGADO) throw new Error('La liquidación ya fue finalizada y no se puede modificar');
  return { s, f };
}

function refrescar(id: number) {
  revalidatePath(`/liquidaciones/${id}/editar`);
}

export async function crearLiquidacion(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const punto = entero(form.get('id_punto_emision'));
  const cliente = entero(form.get('id_cliente'));
  const fecha = texto(form.get('fecha_emision'));
  if (!punto) return { mensaje: 'Elija el punto de emisión' };
  if (!cliente) return { mensaje: 'Elija el proveedor' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
  if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
  const [okCli] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
  if (!okCli) return { mensaje: 'Proveedor no válido' };
  const [f] = await sql<{ id: number }[]>`
    insert into liquidacion_compra (id_emisor, id_cliente, id_punto_emison, fecha_emision, numero, clave_de_acceso, estado)
    values (${s.emisorId}, ${cliente}, ${punto}, ${fecha}::timestamp, '', '', ${ESTADO.PENDIENTE})
    returning id`;
  redirect(`/liquidaciones/${f.id}/editar`);
}

export async function actualizarCabecera(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const punto = entero(form.get('id_punto_emision'));
    const cliente = entero(form.get('id_cliente'));
    const fecha = texto(form.get('fecha_emision'));
    if (!punto || !cliente) return { mensaje: 'Complete punto de emisión y proveedor' };
    const [okCli] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
    if (!okCli) return { mensaje: 'Proveedor no válido' };
    const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
    if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
    await sql`
      update liquidacion_compra set id_cliente = ${cliente}, id_punto_emison = ${punto}, fecha_emision = ${fecha}::timestamp,
        fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id}`;
    refrescar(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarLinea(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const idProducto = entero(form.get('id_producto'));
    const cantidad = decimal(form.get('cantidad')) ?? 0;
    const precio = decimal(form.get('precio'));
    const desc = decimal(form.get('descuento')) ?? 0;
    if (!idProducto) return { mensaje: 'Elija un producto' };
    if (cantidad <= 0) return { mensaje: 'La cantidad debe ser mayor a cero' };
    if (!Number.isInteger(cantidad)) return { mensaje: 'La cantidad debe ser un número entero' };
    if (desc < 0 || desc > 100) return { mensaje: 'Descuento entre 0 y 100%' };
    const [p] = await sql<{ precio: number; iva: number; ice: number; irbpnr: number }[]>`
      select p.precio, iva.porcentaje iva, ice.porcentaje ice, irb.porcentaje irbpnr
      from producto p
      join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
      join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
      join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
      where p.id = ${idProducto} and p.id_emisor = ${s.emisorId}`;
    if (!p) return { mensaje: 'Producto no encontrado' };
    const imp = { ivaPct: Number(p.iva), icePct: Number(p.ice), irbpnrPct: Number(p.irbpnr) };
    const l = calcularLinea(precio ?? Number(p.precio), cantidad, desc, imp, false);
    await sql`
      insert into detalle_liquidacion ${sql({ id_liquidacion: id, id_producto: idProducto, ...l, adicional: texto(form.get('adicional')) || null })}`;
    await recalcularLiquidacion(id);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function actualizarLinea(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const idLinea = Number(form.get('id_linea'));
    await borrador(id);
    const cantidad = decimal(form.get('cantidad')) ?? 0;
    const precio = decimal(form.get('precio'));
    const desc = decimal(form.get('descuento')) ?? 0;
    if (cantidad <= 0 || !Number.isInteger(cantidad)) return { mensaje: 'Cantidad no válida' };
    if (precio == null || precio < 0) return { mensaje: 'Precio no válido' };
    const [d] = await sql<{ id_producto: number; cantidad: number; iva: number; ice: number; irbpnr: number }[]>`
      select d.id_producto, d.cantidad, iva.porcentaje iva, ice.porcentaje ice, irb.porcentaje irbpnr
      from detalle_liquidacion d join producto p on p.id = d.id_producto
      join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
      join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
      join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
      where d.id = ${idLinea} and d.id_liquidacion = ${id}`;
    if (!d) return { mensaje: 'Línea no encontrada' };
    const l = calcularLinea(precio, cantidad, desc, { ivaPct: Number(d.iva), icePct: Number(d.ice), irbpnrPct: Number(d.irbpnr) }, false);
    await sql`update detalle_liquidacion set ${sql({ ...l, adicional: texto(form.get('adicional')) || null })} where id = ${idLinea}`;
    await recalcularLiquidacion(id);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarLinea(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from detalle_liquidacion where id = ${Number(form.get('id_linea'))} and id_liquidacion = ${id}`;
  await recalcularLiquidacion(id);
  refrescar(id);
}

export async function agregarPago(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const forma = entero(form.get('id_form_pago'));
    let valor = decimal(form.get('valor'));
    const plazo = entero(form.get('plazo'));
    const tiempo = texto(form.get('timpo')) || 'NINGUNO';
    if (!forma) return { mensaje: 'Elija la forma de pago' };
    if (valor == null) {
      const [r] = await sql<{ pendiente: number }[]>`
        select f.total - coalesce((select sum(valor) from detalle_pago_liquidacion where id_liquidacion = f.id), 0) pendiente
        from liquidacion_compra f where f.id = ${id}`;
      valor = Number(r.pendiente);
    }
    if (valor <= 0) return { mensaje: 'El valor del pago debe ser mayor a cero' };
    await sql`insert into detalle_pago_liquidacion (id_liquidacion, id_form_pago, valor, plazo, timpo) values (${id}, ${forma}, ${valor}, ${plazo}, ${tiempo})`;
    await sql`update liquidacion_compra set estado = ${ESTADO.PAGADO} where id = ${id}`;
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarPago(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from detalle_pago_liquidacion where id = ${Number(form.get('id_pago'))} and id_liquidacion = ${id}`;
  await sql`update liquidacion_compra set estado = ${ESTADO.PENDIENTE} where id = ${id} and not exists (select 1 from detalle_pago_liquidacion where id_liquidacion = ${id})`;
  refrescar(id);
}

export async function agregarAdicional(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const nombre = texto(form.get('nombre'));
    const descripcion = texto(form.get('descripcion'));
    if (!nombre || !descripcion) return { mensaje: 'Complete nombre y descripción' };
    await sql`insert into datos_adicionales_liquidacion (id_liquidacion, nombre, descripcion) values (${id}, ${nombre.slice(0, 50)}, ${descripcion.slice(0, 300)})`;
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
  await sql`delete from datos_adicionales_liquidacion where id = ${Number(form.get('id_adicional'))} and id_liquidacion = ${id}`;
  refrescar(id);
}

export async function eliminarBorrador(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql.begin(async (tx) => {
    await tx`delete from detalle_liquidacion where id_liquidacion = ${id}`;
    await tx`delete from detalle_pago_liquidacion where id_liquidacion = ${id}`;
    await tx`delete from datos_adicionales_liquidacion where id_liquidacion = ${id}`;
    await tx`delete from liquidacion_compra where id = ${id}`;
  });
  revalidatePath('/liquidaciones');
  redirect('/liquidaciones');
}

/** Valida la liquidacion y la emite (numeracion, firma, SRI) */
export async function emitirLiquidacion(_p: Estado, form: FormData): Promise<Estado> {
  const id = Number(form.get('id'));
  let destino: string | null = null;
  try {
    const { s } = await borrador(id);
    const [f] = await sql<{ total: number; id_cliente: number; lineas: number; pagos: number; suma_pagos: number }[]>`
      select f.total, f.id_cliente,
        (select count(*) from detalle_liquidacion where id_liquidacion = f.id) lineas,
        (select count(*) from detalle_pago_liquidacion where id_liquidacion = f.id) pagos,
        (select coalesce(sum(valor), 0) from detalle_pago_liquidacion where id_liquidacion = f.id) suma_pagos
      from liquidacion_compra f where f.id = ${id}`;
    if (!f.lineas) return { mensaje: 'Agregue al menos un producto' };
    if (!f.pagos) return { mensaje: 'Agregue la forma de pago' };
    if (Math.abs(Number(f.suma_pagos) - Number(f.total)) > 0.009) return { mensaje: `La suma de los pagos ($${Number(f.suma_pagos).toFixed(2)}) no coincide con el total ($${Number(f.total).toFixed(2)})` };
    const r = await emitir(2, id, s.emisorId);
    revalidatePath('/liquidaciones');
    if (r.estado > 0) destino = `/liquidaciones/${id}`;
    if (!destino) return { mensaje: r.mensaje };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
