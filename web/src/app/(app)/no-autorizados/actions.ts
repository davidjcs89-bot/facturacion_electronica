'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { consultarAutorizacionYGuardar } from '@/lib/comprobantes/procesar';
import { colaDelEmisor } from './datos';

export type EstadoForm = { ok?: boolean; mensaje?: string; detalle?: string[] };

/** Consulta en el SRI la autorizacion de los comprobantes pendientes del emisor (cola de envio) */
export async function procesarPendientes(_p: EstadoForm): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const cola = (await colaDelEmisor(s.emisorId)).slice(0, 20);
  if (!cola.length) return { ok: true, mensaje: 'No hay comprobantes pendientes en la cola.' };
  const detalle: string[] = [];
  let autorizados = 0;
  for (const c of cola) {
    try {
      const r = await consultarAutorizacionYGuardar(c.tipo, c.id, s.emisorId);
      if (r.estado === 6) autorizados++;
      detalle.push(`${c.tipo}/${c.id}: ${r.mensaje}`);
    } catch (e) {
      detalle.push(`${c.tipo}/${c.id}: ${(e as Error).message}`);
    }
  }
  revalidatePath('/no-autorizados');
  return { ok: true, mensaje: `Se consultaron ${cola.length} comprobantes; ${autorizados} quedaron autorizados.`, detalle };
}
