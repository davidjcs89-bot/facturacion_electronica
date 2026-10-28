'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirAdminSistema } from '@/lib/auth';
import { guardarSesion } from '@/lib/session';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import type { EstadoForm } from '../_comun/Msg';

/** El administrador pasa a trabajar con los datos de un emisor */
export async function trabajarConEmisor(form: FormData) {
  const s = await requerirAdminSistema();
  const id = Number(form.get('id'));
  const [e] = await sql`select 1 from emisor where id = ${id}`;
  if (!e) redirect('/admin/emisores');
  await guardarSesion({ ...s, emisorId: id });
  redirect('/');
}

export async function salirDelEmisor() {
  const s = await requerirAdminSistema();
  await guardarSesion({ ...s, emisorId: null });
  redirect('/admin/emisores');
}

export async function guardarHabilitacion(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  await requerirAdminSistema();
  const id = Number(form.get('id'));
  const desde = texto(form.get('fecha_desde'));
  const hasta = texto(form.get('fecha_hasta'));
  const estado = entero(form.get('estado'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { mensaje: 'Fechas no válidas' };
  if (hasta < desde) return { mensaje: 'La fecha hasta debe ser posterior a la fecha desde' };
  if (estado == null || estado < 0 || estado > 3) return { mensaje: 'Estado no válido' };
  await sql.begin(async (tx) => {
    await tx`insert into emisor_habilitacion (id_emisor, fecha_desde, fecha_hasta)
      values (${id}, ${desde}::timestamp, ${hasta}::timestamp + interval '23 hours 59 minutes')
      on conflict (id_emisor) do update set fecha_desde = excluded.fecha_desde, fecha_hasta = excluded.fecha_hasta`;
    await tx`update emisor set estado = ${estado}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
  });
  revalidatePath('/admin/emisores');
  revalidatePath(`/admin/emisores/${id}`);
  return { ok: true, mensaje: 'Habilitación guardada' };
}
