import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE = 'fe_sesion';
const DURACION_HORAS = 12;

export type Sesion = {
  uid: number;
  usuario: string;
  nombre: string;
  rol: number; // 1 = administrador del sistema, 2 = administrador de empresa
  emisorId: number | null; // emisor con el que se esta trabajando
};

function clave() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET no configurado (minimo 32 caracteres)');
  return new TextEncoder().encode(s);
}

export async function firmarSesion(s: Sesion) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_HORAS}h`)
    .sign(clave());
}

export async function leerToken(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return {
      uid: Number(payload.uid),
      usuario: String(payload.usuario),
      nombre: String(payload.nombre),
      rol: Number(payload.rol),
      emisorId: payload.emisorId == null ? null : Number(payload.emisorId),
    };
  } catch {
    return null;
  }
}

export async function guardarSesion(s: Sesion) {
  const jar = await cookies();
  jar.set(COOKIE, await firmarSesion(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_HORAS * 3600,
  });
}

export async function borrarSesion() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function sesionActual(): Promise<Sesion | null> {
  const jar = await cookies();
  return leerToken(jar.get(COOKIE)?.value);
}
