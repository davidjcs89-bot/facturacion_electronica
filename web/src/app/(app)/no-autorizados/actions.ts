'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { procesarPendiente } from '@/lib/comprobantes/procesar';
import { colaDelEmisor } from './datos';

export type EstadoForm = { ok?: boolean; mensaje?: string; detalle?: string[] };

/**
 * Procesa la cola de pendientes del emisor: reenvia al SRI los que nunca recibio (quedaron Finalizados por una
 * falla del SRI) y consulta la autorizacion de los recibidos.
 */
export async function procesarPendientes(_p: EstadoForm): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const cola = (await colaDelEmisor(s.emisorId)).slice(0, 20);
  if (!cola.length) return { ok: true, mensaje: 'No hay comprobantes pendientes en la cola.' };
  const detalle: string[] = [];
  let autorizados = 0;
  let sriFallando = false;
  for (const c of cola) {
    try {
      const r = await procesarPendiente(c.tipo, c.id, s.emisorId, sriFallando);
      if (r.fallaSri) sriFallando = true;
      if (r.estado === 6) autorizados++;
      detalle.push(`${c.tipo}/${c.id}: ${r.mensaje}`);
    } catch (e) {
      detalle.push(`${c.tipo}/${c.id}: ${(e as Error).message}`);
    }
  }
  revalidatePath('/no-autorizados');
  return { ok: true, mensaje: `Se procesaron ${cola.length} comprobantes; ${autorizados} quedaron autorizados.` + (sriFallando ? ' El SRI está fallando: los no recibidos siguen en la cola.' : ''), detalle };
}
