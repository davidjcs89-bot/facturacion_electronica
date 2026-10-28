'use server';
import { redirect } from 'next/navigation';
import { validarCredenciales } from '@/lib/auth';
import { guardarSesion, borrarSesion } from '@/lib/session';

export type EstadoLogin = { error?: string };

export async function iniciarSesion(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const usuario = String(form.get('usuario') ?? '').trim();
  const clave = String(form.get('clave') ?? '');
  if (!usuario || !clave) return { error: 'Ingrese usuario y clave' };
  const r = await validarCredenciales(usuario, clave);
  if (!r.ok) return { error: r.error };
  await guardarSesion(r.sesion);
  redirect(r.sinEmisor ? '/configuracion/emisor' : '/');
}

export async function cerrarSesion() {
  await borrarSesion();
  redirect('/login');
}
