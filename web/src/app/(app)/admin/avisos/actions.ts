'use server';
import { revalidatePath } from 'next/cache';
import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import type { EstadoForm } from '../_comun/Msg';

export async function guardarAviso(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  await requerirAdminSistema();
  const id = entero(form.get('id'));
  const mensaje = texto(form.get('message'));
  if (!mensaje) return { mensaje: 'Escriba el aviso' };
  if (id) await sql`update avisos set message = ${mensaje} where id = ${id}`;
  else await sql`insert into avisos (message) values (${mensaje})`;
  revalidatePath('/admin/avisos');
  revalidatePath('/');
  return { ok: true, mensaje: id ? 'Aviso actualizado' : 'Aviso publicado' };
}

export async function eliminarAviso(form: FormData) {
  await requerirAdminSistema();
  await sql`delete from avisos where id = ${Number(form.get('id'))}`;
  revalidatePath('/admin/avisos');
  revalidatePath('/');
}
