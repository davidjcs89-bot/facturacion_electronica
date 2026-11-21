'use server';
import { revalidatePath } from 'next/cache';
import { requerirSesion, cifrarClave } from '@/lib/auth';
import { guardarSesion } from '@/lib/session';
import { sql } from '@/lib/db';
import { texto } from '@/lib/params';
import { PROVINCIAS, cantonesDe } from '@/lib/ubicacion';
import { registrarLog } from '@/lib/correo';
import type { EstadoForm } from '../admin/_comun/Msg';

/** El propio usuario cambia su nombre, apellido, dirección, ciudad y provincia */
export async function guardarMiCuenta(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirSesion();
  const d = {
    nombre: texto(form.get('nombre')).toUpperCase(),
    apellido: texto(form.get('apellido')).toUpperCase(),
    direccion_dom_cuenta: texto(form.get('direccion_dom_cuenta')).toUpperCase(),
    provincia: texto(form.get('provincia')).toUpperCase(),
    ciudad: texto(form.get('ciudad')).toUpperCase(),
  };
  if (!d.nombre || !d.apellido) return { mensaje: 'Ingrese nombre y apellido' };
  if (d.nombre.length > 50 || d.apellido.length > 50) return { mensaje: 'Nombre y apellido: máximo 50 caracteres' };
  if (d.direccion_dom_cuenta.length > 70) return { mensaje: 'Dirección: máximo 70 caracteres' };
  if (!d.direccion_dom_cuenta) return { mensaje: 'Ingrese la dirección' };
  if (!PROVINCIAS.some((p) => p.nombre === d.provincia)) return { mensaje: 'Elija la provincia' };
  if (!cantonesDe(d.provincia).includes(d.ciudad)) return { mensaje: 'Elija la ciudad' };
  await sql`update usuario set ${sql(d)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${s.uid}`;
  await guardarSesion({ ...s, nombre: `${d.nombre} ${d.apellido}`.trim() });
  revalidatePath('/', 'layout');
  return { ok: true, mensaje: 'Datos guardados.' };
}

/** El propio usuario cambia su clave: pide la actual */
export async function cambiarMiClave(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirSesion();
  const actual = String(form.get('actual') ?? '');
  const nueva = String(form.get('nueva') ?? '');
  const repetir = String(form.get('repetir') ?? '');
  const [u] = await sql<{ clave: string }[]>`select clave from usuario where id = ${s.uid}`;
  if (!u || u.clave.toUpperCase() !== cifrarClave(actual)) return { mensaje: 'La clave actual no es correcta' };
  if (nueva.length < 6) return { mensaje: 'La nueva clave debe tener al menos 6 caracteres' };
  if (nueva !== repetir) return { mensaje: 'Las dos claves nuevas no coinciden' };
  if (nueva === actual) return { mensaje: 'La nueva clave debe ser distinta de la actual' };
  await sql`update usuario set clave = ${cifrarClave(nueva)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${s.uid}`;
  await registrarLog(`Usuario ${s.uid} cambió su clave`);
  return { ok: true, mensaje: 'Clave cambiada. Úsela la próxima vez que ingrese.' };
}
