'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { calcularLinea } from '@/lib/comprobantes/calculos';
import { recalcularFactura } from '@/lib/comprobantes/factura';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO, ID_CONSUMIDOR_FINAL, MONTO_MAXIMO_CONSUMIDOR_FINAL } from '@/lib/constantes';

export type Estado = { ok?: boolean; mensaje?: string };

/** Verifica que la factura sea del emisor y siga en borrador */
async function borrador(id: number) {
  const s = await requerirEmisor();
  const [f] = await sql<{ id: number; estado: number; id_punto_emison: number }[]>`
    select id, estado, id_punto_emison from factura where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!f) throw new Error('Factura no encontrada');
  if (f.estado !== ESTADO.PENDIENTE && f.estado !== ESTADO.PAGADO) throw new Error('La factura ya fue finalizada y no se puede modificar');
  return { s, f };
}

function refrescar(id: number) {
  revalidatePath(`/facturas/${id}/editar`);
}

async function ajustarStock(idProducto: number, idPunto: number, delta: number) {
  if (!delta) return;
  await sql`
    update productos_x_bodega set stock = stock - ${delta}
    where id_producto = ${idProducto} and id_bodega = (select id_bodega from puntos_emisior where id = ${idPunto})`;
}

export async function crearFactura(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const punto = entero(form.get('id_punto_emision'));
  const cliente = entero(form.get('id_cliente'));
  const fecha = texto(form.get('fecha_emision'));
  if (!punto) return { mensaje: 'Elija el punto de emisión' };
  if (!cliente) return { mensaje: 'Elija el cliente' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
  if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
  if (cliente !== ID_CONSUMIDOR_FINAL) {
    const [okCli] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
    if (!okCli) return { mensaje: 'Cliente no válido' };
  }
  const [f] = await sql<{ id: number }[]>`
    insert into factura (id_emisor, id_cliente, id_punto_emison, fecha_emision, numero, clave_de_acceso, estado,
      desde_proforma, es_mayorista, guia_de_remision)
    values (${s.emisorId}, ${cliente}, ${punto}, ${fecha}::timestamp, '', '', ${ESTADO.PENDIENTE}, false,
      ${form.get('es_mayorista') === 'on'}, ${texto(form.get('guia_de_remision')) || null})
    returning id`;
  redirect(`/facturas/${f.id}/editar`);
}

export async function actualizarCabecera(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const punto = entero(form.get('id_punto_emision'));
    const cliente = entero(form.get('id_cliente'));
    const fecha = texto(form.get('fecha_emision'));
    if (!punto || !cliente) return { mensaje: 'Complete punto de emisión y cliente' };
    if (cliente !== ID_CONSUMIDOR_FINAL) {
      const [okCli] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
      if (!okCli) return { mensaje: 'Cliente no válido' };
    }
    const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
    if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
    await sql`
      update factura set id_cliente = ${cliente}, id_punto_emison = ${punto}, fecha_emision = ${fecha}::timestamp,
        guia_de_remision = ${texto(form.get('guia_de_remision')) || null}, es_mayorista = ${form.get('es_mayorista') === 'on'},
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
    const { s, f } = await borrador(id);
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
    const l = precio != null ? calcularLinea(precio, cantidad, desc, imp, true) : calcularLinea(Number(p.precio), cantidad, desc, imp, false);
    await sql`
      insert into detalle_factura ${sql({ id_factura: id, id_producto: idProducto, ...l, adicional: texto(form.get('adicional')) || null })}`;
    await ajustarStock(idProducto, f.id_punto_emison, cantidad);
    await recalcularFactura(id);
    return await validarConsumidorFinal(id);
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

async function validarConsumidorFinal(id: number): Promise<Estado> {
  const [f] = await sql<{ total: number; id_cliente: number }[]>`select total, id_cliente from factura where id = ${id}`;
  if (f.id_cliente === ID_CONSUMIDOR_FINAL && Number(f.total) > MONTO_MAXIMO_CONSUMIDOR_FINAL) {
    return { mensaje: `Atención: el total supera los $${MONTO_MAXIMO_CONSUMIDOR_FINAL} permitidos para Consumidor Final. Cambie el cliente antes de emitir.` };
  }
  return { ok: true };
}

export async function actualizarLinea(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const idLinea = Number(form.get('id_linea'));
    const { f } = await borrador(id);
    const cantidad = decimal(form.get('cantidad')) ?? 0;
    const precio = decimal(form.get('precio'));
    const desc = decimal(form.get('descuento')) ?? 0;
    if (cantidad <= 0 || !Number.isInteger(cantidad)) return { mensaje: 'Cantidad no válida' };
    if (precio == null || precio < 0) return { mensaje: 'Precio no válido' };
    const [d] = await sql<{ id_producto: number; cantidad: number; iva: number; ice: number; irbpnr: number }[]>`
      select d.id_producto, d.cantidad, iva.porcentaje iva, ice.porcentaje ice, irb.porcentaje irbpnr
      from detalle_factura d join producto p on p.id = d.id_producto
      join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
      join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
      join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
      where d.id = ${idLinea} and d.id_factura = ${id}`;
    if (!d) return { mensaje: 'Línea no encontrada' };
    const l = calcularLinea(precio, cantidad, desc, { ivaPct: Number(d.iva), icePct: Number(d.ice), irbpnrPct: Number(d.irbpnr) }, true);
    await sql`update detalle_factura set ${sql({ ...l, adicional: texto(form.get('adicional')) || null })} where id = ${idLinea}`;
    await ajustarStock(d.id_producto, f.id_punto_emison, cantidad - Number(d.cantidad));
    await recalcularFactura(id);
    return await validarConsumidorFinal(id);
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarLinea(form: FormData) {
  const id = Number(form.get('id'));
  const { f } = await borrador(id);
  const [d] = await sql<{ id_producto: number; cantidad: number }[]>`
    delete from detalle_factura where id = ${Number(form.get('id_linea'))} and id_factura = ${id} returning id_producto, cantidad`;
  if (d) await ajustarStock(d.id_producto, f.id_punto_emison, -Number(d.cantidad));
  await recalcularFactura(id);
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
        select f.total - coalesce((select sum(valor) from detalle_pago_factura where id_factura = f.id), 0) pendiente
        from factura f where f.id = ${id}`;
      valor = Number(r.pendiente);
    }
    if (valor <= 0) return { mensaje: 'El valor del pago debe ser mayor a cero' };
    await sql`insert into detalle_pago_factura (id_factura, id_form_pago, valor, plazo, timpo) values (${id}, ${forma}, ${valor}, ${plazo}, ${tiempo})`;
    await sql`update factura set estado = ${ESTADO.PAGADO} where id = ${id}`;
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
  await sql`delete from detalle_pago_factura where id = ${Number(form.get('id_pago'))} and id_factura = ${id}`;
  await sql`update factura set estado = ${ESTADO.PENDIENTE} where id = ${id} and not exists (select 1 from detalle_pago_factura where id_factura = ${id})`;
  refrescar(id);
}

export async function agregarAdicional(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const nombre = texto(form.get('nombre'));
    const descripcion = texto(form.get('descripcion'));
    if (!nombre || !descripcion) return { mensaje: 'Complete nombre y descripción' };
    await sql`insert into datos_adicionales_factura (id_factura, nombre, descripcion) values (${id}, ${nombre.slice(0, 50)}, ${descripcion.slice(0, 300)})`;
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
  await sql`delete from datos_adicionales_factura where id = ${Number(form.get('id_adicional'))} and id_factura = ${id}`;
  refrescar(id);
}

export async function eliminarBorrador(form: FormData) {
  const id = Number(form.get('id'));
  const { f } = await borrador(id);
  const lineas = await sql<{ id_producto: number; cantidad: number }[]>`select id_producto, cantidad from detalle_factura where id_factura = ${id}`;
  for (const l of lineas) await ajustarStock(l.id_producto, f.id_punto_emison, -Number(l.cantidad));
  await sql.begin(async (tx) => {
    await tx`delete from detalle_factura where id_factura = ${id}`;
    await tx`delete from detalle_pago_factura where id_factura = ${id}`;
    await tx`delete from datos_adicionales_factura where id_factura = ${id}`;
    await tx`delete from factura where id = ${id}`;
  });
  revalidatePath('/facturas');
  redirect('/facturas');
}

/** Valida el borrador y lo emite (numeracion, firma, SRI) */
export async function emitirFactura(_p: Estado, form: FormData): Promise<Estado> {
  const id = Number(form.get('id'));
  let destino: string | null = null;
  try {
    const { s } = await borrador(id);
    const [f] = await sql<{ total: number; id_cliente: number; lineas: number; pagos: number; suma_pagos: number }[]>`
      select f.total, f.id_cliente,
        (select count(*) from detalle_factura where id_factura = f.id) lineas,
        (select count(*) from detalle_pago_factura where id_factura = f.id) pagos,
        (select coalesce(sum(valor), 0) from detalle_pago_factura where id_factura = f.id) suma_pagos
      from factura f where f.id = ${id}`;
    if (!f.lineas) return { mensaje: 'Agregue al menos un producto' };
    if (!f.pagos) return { mensaje: 'Agregue la forma de pago' };
    if (Math.abs(Number(f.suma_pagos) - Number(f.total)) > 0.009) return { mensaje: `La suma de los pagos ($${Number(f.suma_pagos).toFixed(2)}) no coincide con el total ($${Number(f.total).toFixed(2)})` };
    if (f.id_cliente === ID_CONSUMIDOR_FINAL && Number(f.total) > MONTO_MAXIMO_CONSUMIDOR_FINAL) {
      return { mensaje: `Una factura a Consumidor Final no puede superar $${MONTO_MAXIMO_CONSUMIDOR_FINAL}` };
    }
    const r = await emitir(1, id, s.emisorId);
    revalidatePath('/facturas');
    if (r.estado > 0) destino = `/facturas/${id}`;
    if (!destino) return { mensaje: r.mensaje };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
