'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import type { EstadoForm } from '../admin/_comun/Msg';

export async function guardarAtributo(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const id = entero(form.get('id'));
  const nombre = texto(form.get('nombre')).toUpperCase();
  if (!nombre) return { mensaje: 'Ingrese el nombre del atributo' };
  if (nombre.length > 100) return { mensaje: 'Máximo 100 caracteres' };
  const dup = await sql`select 1 from atributos_fichas_clientes where id_emisor = ${s.emisorId} and upper(nombre) = ${nombre} ${id ? sql`and id <> ${id}` : sql``}`;
  if (dup.length) return { mensaje: 'Ya existe un atributo con ese nombre' };
  if (id) await sql`update atributos_fichas_clientes set nombre = ${nombre} where id = ${id} and id_emisor = ${s.emisorId}`;
  else await sql`insert into atributos_fichas_clientes (id_emisor, nombre) values (${s.emisorId}, ${nombre})`;
  revalidatePath('/atributos-fichas');
  return { ok: true, mensaje: 'Atributo guardado' };
}

export async function eliminarAtributo(form: FormData) {
  const s = await requerirEmisor();
  // las fichas de clientes con este atributo se borran en cascada
  await sql`delete from atributos_fichas_clientes where id = ${Number(form.get('id'))} and id_emisor = ${s.emisorId}`;
  revalidatePath('/atributos-fichas');
}
