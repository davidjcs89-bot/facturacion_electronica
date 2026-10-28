'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';

export type EstadoForm = { ok?: boolean; mensaje?: string };

export async function guardarBodega(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const id = entero(form.get('id'));
  const codigo = texto(form.get('codigo')).toUpperCase();
  const nombre = texto(form.get('nombre')).toUpperCase();
  const activa = form.get('activa') === 'on';
  if (!codigo || codigo.length > 10) return { mensaje: 'Código requerido (máx. 10 caracteres)' };
  if (!nombre) return { mensaje: 'Ingrese el nombre' };
  const [dup] = await sql`select 1 from bodegas where id_emisor = ${s.emisorId} and upper(codigo) = ${codigo} ${id ? sql`and id <> ${id}` : sql``}`;
  if (dup) return { mensaje: 'Ya existe una bodega con ese código' };
  if (id) {
    const r = await sql`update bodegas set codigo = ${codigo}, nombre = ${nombre}, activa = ${activa} where id = ${id} and id_emisor = ${s.emisorId} returning id`;
    if (!r.length) return { mensaje: 'Bodega no encontrada' };
  } else {
    await sql`insert into bodegas (id_emisor, codigo, nombre, activa) values (${s.emisorId}, ${codigo}, ${nombre}, ${activa})`;
  }
  revalidatePath('/bodegas');
  redirect('/bodegas');
}
