'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { validarIdentificacion, emailValido } from '@/lib/validaciones';
import type { EstadoForm } from '../admin/_comun/Msg';

export async function guardarTransportista(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const id = entero(form.get('id'));
  const d = {
    nombre: texto(form.get('nombre')).toUpperCase(),
    tipo_identificacion: entero(form.get('tipo_identificacion')) ?? 2,
    numero_identificacion: texto(form.get('numero_identificacion')),
    placa: texto(form.get('placa')).toUpperCase(),
    correo: texto(form.get('correo')).toLowerCase() || null,
  };
  if (!d.nombre) return { mensaje: 'Ingrese el nombre' };
  const err = validarIdentificacion(d.tipo_identificacion, d.numero_identificacion);
  if (err) return { mensaje: err };
  if (!d.placa) return { mensaje: 'Ingrese la placa' };
  if (d.correo && !emailValido(d.correo)) return { mensaje: 'Correo no válido' };
  let nuevo = id;
  if (id) {
    const r = await sql`update transportistas set ${sql(d)}, fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id} and id_emisor = ${s.emisorId} returning id`;
    if (!r.length) return { mensaje: 'Transportista no encontrado' };
  } else {
    const [r] = await sql<{ id: number }[]>`insert into transportistas ${sql({ ...d, id_emisor: s.emisorId })} returning id`;
    nuevo = r.id;
  }
  revalidatePath('/transportistas');
  redirect(`/transportistas/${nuevo}?guardado=1`);
}

export async function eliminarTransportista(form: FormData) {
  const s = await requerirEmisor();
  const id = Number(form.get('id'));
  const [uso] = await sql<{ n: number }[]>`select count(*) n from guia_remision where id_transportista = ${id}`;
  if (uso.n > 0) redirect(`/transportistas/${id}?error=uso`);
  await sql`delete from transportistas where id = ${id} and id_emisor = ${s.emisorId}`;
  revalidatePath('/transportistas');
  redirect('/transportistas');
}
