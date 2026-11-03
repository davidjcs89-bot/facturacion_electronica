'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { procesarPendiente } from '@/lib/comprobantes/procesar';
import { colaDelEmisor } from './datos';
import { sql } from '@/lib/db';
import { revisarSri, type Revision } from '@/lib/sri/estado';

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

export type EstadoSriForm = { revisiones?: Revision[]; ambiente?: string; hora?: string; error?: string };

/** Revisa si los servicios del SRI del ambiente del emisor estan funcionando */
export async function revisarEstadoSri(_p: EstadoSriForm): Promise<EstadoSriForm> {
  const s = await requerirEmisor();
  try {
    const [e] = await sql<{ ruc: string; codigo_ambiente: string }[]>`
      select e.ruc, a.codigo_ambiente from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente where e.id = ${s.emisorId}`;
    const ambiente = e.codigo_ambiente === '2' ? '2' : '1';
    const revisiones = await revisarSri(ambiente, e.ruc);
    const hora = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
    return { revisiones, ambiente: ambiente === '2' ? 'Producción' : 'Pruebas', hora };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
