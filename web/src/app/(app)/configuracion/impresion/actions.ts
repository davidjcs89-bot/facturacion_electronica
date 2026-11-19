'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import type { EstadoForm } from '../../admin/_comun/Msg';

/** Configuracion de impresion por tipo de comprobante: linea de firma y mensaje al pie */
export async function guardarImpresion(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const tipo = entero(form.get('id_comprobante'));
  if (!tipo || tipo < 1 || tipo > 6) return { mensaje: 'Tipo de comprobante no válido' };
  const firma = form.get('firma') === 'on';
  const mensajes = texto(form.get('mensajes')) || null;
  await sql`
    insert into impresion_comprobantes (id_comprobante, id_emisor, firma, mensajes) values (${tipo}, ${s.emisorId}, ${firma}, ${mensajes})
    on conflict (id_comprobante, id_emisor) do update set firma = excluded.firma, mensajes = excluded.mensajes`;
  revalidatePath('/configuracion/impresion');
  return { ok: true, mensaje: 'Configuración guardada' };
}

/** Formato de impresion (A4 / ticket 80 / ticket 58) y que hacer al emitir (preguntar / siempre / nunca) */
export async function guardarFormato(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const formato = String(form.get('formato') ?? '');
  const alEmitir = String(form.get('al_emitir') ?? '');
  if (!['a4', 'ticket80', 'ticket58'].includes(formato)) return { mensaje: 'Formato no válido' };
  if (!['preguntar', 'siempre', 'nunca'].includes(alEmitir)) return { mensaje: 'Opción no válida' };
  try {
    await sql`
      insert into impresion_emisor (id_emisor, formato, al_emitir) values (${s.emisorId}, ${formato}, ${alEmitir})
      on conflict (id_emisor) do update set formato = excluded.formato, al_emitir = excluded.al_emitir,
        fecha_modificacion = now() at time zone 'America/Guayaquil'`;
  } catch {
    return { mensaje: 'No se pudo guardar: falta activar esta opción en la base de datos. Avise al administrador.' };
  }
  revalidatePath('/configuracion/impresion');
  return { ok: true, mensaje: 'Configuración guardada' };
}
