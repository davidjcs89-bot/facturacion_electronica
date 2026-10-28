'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirAdminSistema, cifrarClave } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { emailValido } from '@/lib/validaciones';
import type { EstadoForm } from '../_comun/Msg';

export async function guardarUsuario(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  await requerirAdminSistema();
  const id = entero(form.get('id'));
  const d = {
    nombre_usuario: texto(form.get('nombre_usuario')),
    nombre: texto(form.get('nombre')).toUpperCase(),
    apellido: texto(form.get('apellido')).toUpperCase(),
    correo: texto(form.get('correo')),
    numero_telefono: texto(form.get('numero_telefono')),
    direccion_dom_cuenta: texto(form.get('direccion_dom_cuenta')).toUpperCase(),
    ciudad: texto(form.get('ciudad')).toUpperCase(),
    provincia: texto(form.get('provincia')).toUpperCase(),
    estado: entero(form.get('estado')) ?? 1,
    id_categoria: entero(form.get('id_categoria')) ?? 4,
    id_rol: entero(form.get('id_rol')) ?? 2,
    id_emisor: entero(form.get('id_emisor')),
    notificaciones: form.get('notificaciones') === 'on',
  };
  const clave = String(form.get('clave') ?? '');
  if (!/^\S{3,15}$/.test(d.nombre_usuario)) return { mensaje: 'Usuario: de 3 a 15 caracteres, sin espacios' };
  if (!d.nombre || !d.apellido) return { mensaje: 'Ingrese nombre y apellido' };
  if (!emailValido(d.correo)) return { mensaje: 'Correo no válido' };
  const largos: [string, string, number][] = [
    ['Nombre', d.nombre, 50], ['Apellido', d.apellido, 50], ['Correo', d.correo, 50], ['Teléfono', d.numero_telefono, 15],
    ['Dirección', d.direccion_dom_cuenta, 70], ['Ciudad', d.ciudad, 15], ['Provincia', d.provincia, 15],
  ];
  for (const [n, v, m] of largos) if (v.length > m) return { mensaje: `${n}: máximo ${m} caracteres` };
  if (!d.numero_telefono || !d.direccion_dom_cuenta || !d.ciudad || !d.provincia) return { mensaje: 'Complete teléfono, dirección, ciudad y provincia' };
  if (!id && clave.length < 6) return { mensaje: 'La clave debe tener al menos 6 caracteres' };
  if (id && clave && clave.length < 6) return { mensaje: 'La nueva clave debe tener al menos 6 caracteres' };
  const dup = await sql`select 1 from usuario where nombre_usuario = ${d.nombre_usuario} and estado <> 3 ${id ? sql`and id <> ${id}` : sql``}`;
  if (dup.length) return { mensaje: 'Ese nombre de usuario ya existe' };
  let nuevo = id;
  if (id) {
    await sql`update usuario set ${sql(d)}, fecha_modificacion = now() at time zone 'America/Guayaquil'
      ${clave ? sql`, clave = ${cifrarClave(clave)}` : sql``} where id = ${id}`;
  } else {
    const [r] = await sql<{ id: number }[]>`insert into usuario ${sql({ ...d, clave: cifrarClave(clave) })} returning id`;
    nuevo = r.id;
  }
  revalidatePath('/admin/usuarios');
  redirect(`/admin/usuarios/${nuevo}?guardado=1`);
}

/** Baja logica (estado 3), como la app anterior */
export async function eliminarUsuario(form: FormData) {
  const s = await requerirAdminSistema();
  const id = Number(form.get('id'));
  if (id === s.uid) redirect(`/admin/usuarios/${id}?error=propio`);
  await sql`update usuario set estado = 3, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
  revalidatePath('/admin/usuarios');
  redirect('/admin/usuarios');
}
