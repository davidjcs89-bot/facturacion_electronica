'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { moverStock } from '../bodegas/_comun/stock';

export type EstadoForm = { ok?: boolean; mensaje?: string };

/** lineas: JSON [{id_producto, cantidad}] */
export async function guardarIngreso(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const bodega = entero(form.get('id_bodega'));
  const fecha = texto(form.get('fecha'));
  let lineas: { id_producto: number; cantidad: number }[] = [];
  try {
    lineas = JSON.parse(String(form.get('lineas') ?? '[]'));
  } catch {
    return { mensaje: 'Detalle no válido' };
  }
  if (!bodega) return { mensaje: 'Elija la bodega' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  if (!lineas.length) return { mensaje: 'No ha cargado el detalle de productos' };
  if (lineas.some((l) => !Number.isInteger(l.cantidad) || l.cantidad <= 0)) return { mensaje: 'Las cantidades deben ser enteros mayores a cero' };
  const [okB] = await sql`select 1 from bodegas where id = ${bodega} and id_emisor = ${s.emisorId}`;
  if (!okB) return { mensaje: 'Bodega no válida' };
  const ids = [...new Set(lineas.map((l) => Number(l.id_producto)))];
  const validos = await sql<{ id: number }[]>`select id from producto where id_emisor = ${s.emisorId} and id = any(${ids})`;
  if (validos.length !== ids.length) return { mensaje: 'Hay productos que no pertenecen al emisor' };
  const id = await sql.begin(async (tx) => {
    const [i] = await tx<{ id: number }[]>`insert into ingresos_bodega (id_emisor, fecha, id_bodega) values (${s.emisorId}, ${fecha}::timestamp, ${bodega}) returning id`;
    for (const l of lineas) {
      await tx`insert into ingresos_bodega_detalle (id_ingreso, id_producto, cantidad) values (${i.id}, ${l.id_producto}, ${l.cantidad})`;
      await moverStock(tx, l.id_producto, bodega, l.cantidad);
    }
    return i.id;
  });
  revalidatePath('/ingresos-bodega');
  redirect(`/ingresos-bodega/${id}`);
}

/** Elimina el ingreso y revierte el stock */
export async function eliminarIngreso(form: FormData) {
  const s = await requerirEmisor();
  const id = Number(form.get('id'));
  await sql.begin(async (tx) => {
    const [i] = await tx<{ id_bodega: number }[]>`select id_bodega from ingresos_bodega where id = ${id} and id_emisor = ${s.emisorId} for update`;
    if (!i) throw new Error('Ingreso no encontrado');
    const det = await tx<{ id_producto: number; cantidad: number }[]>`select id_producto, cantidad from ingresos_bodega_detalle where id_ingreso = ${id}`;
    for (const d of det) await moverStock(tx, d.id_producto, i.id_bodega, -d.cantidad);
    await tx`delete from ingresos_bodega_detalle where id_ingreso = ${id}`;
    await tx`delete from ingresos_bodega where id = ${id}`;
  });
  revalidatePath('/ingresos-bodega');
  redirect('/ingresos-bodega');
}

/** Busca productos por codigo exacto (para pegar desde Excel: codigo<TAB>cantidad) */
export async function productosPorCodigo(codigos: string[]) {
  const s = await requerirEmisor();
  if (!codigos.length) return [];
  return sql<{ id: number; codigo: string; nombre: string }[]>`
    select id, codigo, nombre from producto where id_emisor = ${s.emisorId} and upper(codigo) = any(${codigos.map((c) => c.toUpperCase())})`;
}
