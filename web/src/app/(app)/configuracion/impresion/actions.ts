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
