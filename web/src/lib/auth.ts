import 'server-only';
import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { sql } from './db';
import { sesionActual, type Sesion } from './session';

export const ROL_ADMIN_SISTEMA = 1;
export const ROL_ADMIN_EMPRESA = 2;

/** Mismo cifrado que la app anterior: SHA-512 en hexadecimal (mayusculas). */
export function cifrarClave(clave: string) {
  return createHash('sha512').update(clave, 'utf8').digest('hex').toUpperCase();
}

export type ResultadoLogin = { ok: true; sesion: Sesion; sinEmisor: boolean } | { ok: false; error: string };

export async function validarCredenciales(usuario: string, clave: string): Promise<ResultadoLogin> {
  const filas = await sql<{
    id: number; nombre_usuario: string; clave: string; nombre: string; apellido: string;
    estado: number; id_rol: number; id_emisor: number | null; fecha_desde: Date | null; fecha_hasta: Date | null;
  }[]>`
    select u.id, u.nombre_usuario, u.clave, u.nombre, u.apellido, u.estado, u.id_rol, u.id_emisor,
           h.fecha_desde, h.fecha_hasta
    from usuario u
    left join emisor_habilitacion h on h.id_emisor = u.id_emisor
    where u.nombre_usuario = ${usuario}
    order by u.id
    limit 1`;
  const u = filas[0];
  if (!u || u.clave.toUpperCase() !== cifrarClave(clave)) {
    return { ok: false, error: 'Error en nombre de usuario o clave' };
  }
  if (u.estado !== 1) return { ok: false, error: 'Usuario deshabilitado' };
  if (u.id_emisor && u.fecha_desde && u.fecha_hasta) {
    const ahora = new Date();
    if (!(u.fecha_desde <= ahora && u.fecha_hasta >= ahora)) {
      return { ok: false, error: 'Usuario deshabilitado: la habilitación del emisor está vencida' };
    }
  }
  return {
    ok: true,
    sinEmisor: !u.id_emisor && u.id_rol !== ROL_ADMIN_SISTEMA,
    sesion: {
      uid: u.id,
      usuario: u.nombre_usuario,
      nombre: `${u.nombre} ${u.apellido}`.trim(),
      rol: u.id_rol,
      emisorId: u.id_emisor,
    },
  };
}

/** Exige sesion iniciada; si no, redirige al login. */
export async function requerirSesion(): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) redirect('/login');
  return s;
}

/** Exige sesion con un emisor activo (pantallas de comprobantes, catalogos, etc.). */
export async function requerirEmisor(): Promise<Sesion & { emisorId: number }> {
  const s = await requerirSesion();
  if (!s.emisorId) redirect(s.rol === ROL_ADMIN_SISTEMA ? '/admin/emisores' : '/configuracion/emisor');
  return s as Sesion & { emisorId: number };
}

export async function requerirAdminSistema(): Promise<Sesion> {
  const s = await requerirSesion();
  if (s.rol !== ROL_ADMIN_SISTEMA) redirect('/');
  return s;
}
