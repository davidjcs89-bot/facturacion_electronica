'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { manejador } from '@/lib/comprobantes/registro';
import { emitir, consultarAutorizacionYGuardar, enviarAlReceptor } from '@/lib/comprobantes/procesar';
import { ESTADO } from '@/lib/constantes';

export type EstadoAccion = { ok?: boolean; mensaje?: string };

async function verificar(tipo: number, id: number) {
  const s = await requerirEmisor();
  const m = manejador(tipo);
  const [x] = await sql<{ estado: number }[]>`
    select estado from ${sql(m.tabla)} where id = ${id} and ${sql(m.colEmisor)} = ${s.emisorId}`;
  if (!x) throw new Error('Comprobante no encontrado');
  return { s, m, estado: x.estado };
}

export async function accionEmitir(_p: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const tipo = Number(form.get('tipo'));
  const id = Number(form.get('id'));
  try {
    const { s, m } = await verificar(tipo, id);
    const r = await emitir(tipo, id, s.emisorId);
    revalidatePath(`${m.ruta}/${id}`);
    revalidatePath(m.ruta);
    return { ok: r.ok, mensaje: r.mensaje };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

export async function accionConsultar(_p: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const tipo = Number(form.get('tipo'));
  const id = Number(form.get('id'));
  try {
    const { s, m } = await verificar(tipo, id);
    const r = await consultarAutorizacionYGuardar(tipo, id, s.emisorId);
    revalidatePath(`${m.ruta}/${id}`);
    return { ok: r.ok, mensaje: r.mensaje };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

export async function accionReenviar(_p: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const tipo = Number(form.get('tipo'));
  const id = Number(form.get('id'));
  const correo = String(form.get('correo') ?? '').trim();
  try {
    await verificar(tipo, id);
    const err = await enviarAlReceptor(tipo, id, correo || undefined);
    return err ? { ok: false, mensaje: err } : { ok: true, mensaje: 'Correo enviado' };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

/** Anula el comprobante en el sistema (la anulacion ante el SRI se hace en el portal del SRI) */
export async function accionAnular(_p: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const tipo = Number(form.get('tipo'));
  const id = Number(form.get('id'));
  try {
    const { m } = await verificar(tipo, id);
    await sql`update ${sql(m.tabla)} set estado = ${ESTADO.ANULADO}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
    revalidatePath(`${m.ruta}/${id}`);
    revalidatePath(m.ruta);
    return { ok: true, mensaje: 'Comprobante anulado en el sistema. Recuerde anularlo también en el portal del SRI si estaba autorizado.' };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}
