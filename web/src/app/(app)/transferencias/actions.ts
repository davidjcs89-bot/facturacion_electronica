'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero } from '@/lib/params';
import { moverStock, stockDe } from '../bodegas/_comun/stock';
import { TRANSF } from './estados';

export type EstadoForm = { ok?: boolean; mensaje?: string };

export async function crearTransferencia(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const desde = entero(form.get('id_bodega_desde'));
  const hasta = entero(form.get('id_bodega_hasta'));
  let lineas: { id_producto: number; cantidad: number }[] = [];
  try { lineas = JSON.parse(String(form.get('lineas') ?? '[]')); } catch { return { mensaje: 'Detalle no válido' }; }
  if (!desde || !hasta) return { mensaje: 'Elija las bodegas' };
  if (desde === hasta) return { mensaje: 'La bodega de origen y destino deben ser distintas' };
  if (!lineas.length) return { mensaje: 'Agregue productos' };
  const bods = await sql`select id from bodegas where id_emisor = ${s.emisorId} and id in (${desde}, ${hasta})`;
  if (bods.length !== 2) return { mensaje: 'Bodegas no válidas' };
  const ids = [...new Set(lineas.map((l) => Number(l.id_producto)))];
  const validos = await sql`select id from producto where id_emisor = ${s.emisorId} and id = any(${ids})`;
  if (validos.length !== ids.length) return { mensaje: 'Hay productos que no pertenecen al emisor' };
  const id = await sql.begin(async (tx) => {
    const [t] = await tx<{ id: number }[]>`insert into transferencia_inventario (id_emisor, id_bodega_desde, id_bodega_hasta, estado)
      values (${s.emisorId}, ${desde}, ${hasta}, ${TRANSF.PENDIENTE}) returning id`;
    for (const l of lineas) {
      if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) throw new Error('Cantidades no válidas');
      await tx`insert into detalle_transferencia_inventario (id_transferencia, id_producto, cantidad) values (${t.id}, ${l.id_producto}, ${l.cantidad})`;
    }
    return t.id;
  });
  revalidatePath('/transferencias');
  redirect(`/transferencias/${id}`);
}

async function cargar(id: number, emisorId: number) {
  const [t] = await sql<{ id_bodega_desde: number; id_bodega_hasta: number; estado: number }[]>`
    select id_bodega_desde, id_bodega_hasta, estado from transferencia_inventario where id = ${id} and id_emisor = ${emisorId}`;
  if (!t) throw new Error('Transferencia no encontrada');
  return t;
}

export async function finalizarTransferencia(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const s = await requerirEmisor();
    const id = Number(form.get('id'));
    await sql.begin(async (tx) => {
      const [t] = await tx<{ id_bodega_desde: number; id_bodega_hasta: number; estado: number }[]>`
        select id_bodega_desde, id_bodega_hasta, estado from transferencia_inventario where id = ${id} and id_emisor = ${s.emisorId} for update`;
      if (!t) throw new Error('Transferencia no encontrada');
      if (t.estado !== TRANSF.PENDIENTE) throw new Error('La transferencia no está pendiente');
      const det = await tx<{ id_producto: number; cantidad: number; codigo: string }[]>`
        select d.id_producto, d.cantidad, p.codigo from detalle_transferencia_inventario d join producto p on p.id = d.id_producto where d.id_transferencia = ${id}`;
      for (const d of det) {
        const disp = await stockDe(tx, d.id_producto, t.id_bodega_desde);
        if (disp < d.cantidad) throw new Error(`Stock insuficiente en la bodega de origen para ${d.codigo} (disponible ${disp})`);
        await moverStock(tx, d.id_producto, t.id_bodega_desde, -d.cantidad);
        await moverStock(tx, d.id_producto, t.id_bodega_hasta, d.cantidad);
      }
      await tx`update transferencia_inventario set estado = ${TRANSF.FINALIZADO}, fecha_finalizacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
    });
    revalidatePath(`/transferencias/${id}`);
    return { ok: true, mensaje: 'Transferencia finalizada: stock movido' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function anularTransferencia(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const s = await requerirEmisor();
    const id = Number(form.get('id'));
    await sql.begin(async (tx) => {
      const [t] = await tx<{ id_bodega_desde: number; id_bodega_hasta: number; estado: number }[]>`
        select id_bodega_desde, id_bodega_hasta, estado from transferencia_inventario where id = ${id} and id_emisor = ${s.emisorId} for update`;
      if (!t) throw new Error('Transferencia no encontrada');
      if (t.estado === TRANSF.ANULADO) throw new Error('Ya está anulada');
      if (t.estado === TRANSF.FINALIZADO) {
        const det = await tx<{ id_producto: number; cantidad: number; codigo: string }[]>`
          select d.id_producto, d.cantidad, p.codigo from detalle_transferencia_inventario d join producto p on p.id = d.id_producto where d.id_transferencia = ${id}`;
        for (const d of det) {
          const disp = await stockDe(tx, d.id_producto, t.id_bodega_hasta);
          if (disp < d.cantidad) throw new Error(`No hay stock suficiente en la bodega destino para revertir ${d.codigo}`);
          await moverStock(tx, d.id_producto, t.id_bodega_hasta, -d.cantidad);
          await moverStock(tx, d.id_producto, t.id_bodega_desde, d.cantidad);
        }
      }
      await tx`update transferencia_inventario set estado = ${TRANSF.ANULADO} where id = ${id}`;
    });
    revalidatePath(`/transferencias/${id}`);
    return { ok: true, mensaje: 'Transferencia anulada' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function eliminarTransferencia(form: FormData) {
  const s = await requerirEmisor();
  const id = Number(form.get('id'));
  const t = await cargar(id, s.emisorId);
  if (t.estado !== TRANSF.PENDIENTE) throw new Error('Solo se eliminan transferencias pendientes');
  await sql.begin(async (tx) => {
    await tx`delete from detalle_transferencia_inventario where id_transferencia = ${id}`;
    await tx`delete from transferencia_inventario where id = ${id}`;
  });
  revalidatePath('/transferencias');
  redirect('/transferencias');
}
