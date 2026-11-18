import 'server-only';
import nodemailer from 'nodemailer';
import { sql } from './db';
import { descifrar } from './cifrado';

export type Adjunto = { nombre: string; contenido: Buffer | Uint8Array | string; tipo?: string };

/** Datos de un servidor de correo (SMTP) */
export type CuentaSmtp = {
  direccion: string;      // correo que aparece como remitente
  nombre: string;         // nombre que ve el destinatario
  servidor: string;
  puerto: number;
  seguridad: 'SSL' | 'STARTTLS' | 'OPCIONAL'; // OPCIONAL: solo la cuenta del sistema heredada (TLS si el servidor lo ofrece)
  usuario: string;
  clave: string;
  copia_a?: string | null; // copia oculta
};

export const SIN_CORREO_EMISOR =
  'La empresa no tiene configurado su correo de envío (Configuración → Correo de envío)';

function destinosDe(destino: string) {
  return destino.split(/[;,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
}

/** Solo nombres de servidor públicos: nada de IPs, localhost ni nombres internos */
export function servidorPermitido(servidor: string) {
  const s = servidor.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/.test(s) || !s.includes('.')) return false;
  if (/^\d+(\.\d+){3}$/.test(s)) return false;
  if (s === 'localhost' || s.endsWith('.local') || s.endsWith('.internal') || s.endsWith('.localhost')) return false;
  return true;
}

function transporte(c: CuentaSmtp) {
  return nodemailer.createTransport({
    host: c.servidor,
    port: c.puerto,
    secure: c.seguridad === 'SSL',
    requireTLS: c.seguridad === 'STARTTLS',
    auth: { user: c.usuario, pass: c.clave },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

/** Traduce los errores de nodemailer a un motivo entendible */
export function motivoError(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string };
  const m = String(err?.message ?? e);
  if (err?.code === 'EAUTH' || err?.responseCode === 535 || /auth/i.test(m)) {
    return 'Usuario o clave incorrectos. Gmail y Outlook piden una «contraseña de aplicación» en lugar de la clave normal.';
  }
  if (err?.code === 'ETIMEDOUT' || err?.code === 'ECONNECTION' || err?.code === 'ESOCKET' || /timeout|ECONNREFUSED|ENOTFOUND/i.test(m)) {
    return 'No se pudo conectar al servidor. Revise el servidor, el puerto y el tipo de seguridad.';
  }
  if (err?.responseCode === 550 || err?.responseCode === 553) {
    return 'El servidor rechazó el remitente. El correo remitente debe pertenecer a la cuenta configurada.';
  }
  return m.slice(0, 300);
}

async function enviarCon(c: CuentaSmtp, destino: string, asunto: string, html: string, adjuntos: Adjunto[]): Promise<string | null> {
  const destinos = destinosDe(destino);
  if (!destinos.length) return 'Sin destinatario';
  try {
    await transporte(c).sendMail({
      from: { name: c.nombre, address: c.direccion },
      to: destinos,
      ...(c.copia_a ? { bcc: c.copia_a } : {}),
      subject: asunto,
      html,
      attachments: adjuntos.map((a) => ({
        filename: a.nombre,
        content: typeof a.contenido === 'string' ? a.contenido : Buffer.from(a.contenido),
        contentType: a.tipo,
      })),
    });
    return null;
  } catch (e) {
    return motivoError(e);
  }
}

/** Revisa que el servidor acepte la conexión y el usuario/clave (no envía nada) */
export async function verificarCuenta(c: CuentaSmtp): Promise<string | null> {
  try {
    await transporte(c).verify();
    return null;
  } catch (e) {
    return motivoError(e);
  }
}

/** Cuenta de correo propia del emisor (con la clave descifrada), o null si no la configuró */
export async function cuentaDelEmisor(idEmisor: number): Promise<CuentaSmtp | null> {
  const [c] = await sql<{
    direccion: string; servidor: string; puerto: number; seguridad: 'SSL' | 'STARTTLS';
    usuario: string; clave_cifrada: string; copia_a: string | null; nombre_comercial: string;
  }[]>`
    select c.direccion, c.servidor, c.puerto, c.seguridad, c.usuario, c.clave_cifrada, c.copia_a, e.nombre_comercial
    from emisor_correo c join emisor e on e.id = c.id_emisor
    where c.id_emisor = ${idEmisor}`;
  if (!c) return null;
  return {
    direccion: c.direccion, nombre: c.nombre_comercial, servidor: c.servidor, puerto: c.puerto,
    seguridad: c.seguridad, usuario: c.usuario, clave: descifrar(c.clave_cifrada), copia_a: c.copia_a,
  };
}

/**
 * Envía un correo de una empresa (comprobantes, proformas, pedidos) desde SU servidor de correo.
 * El remitente que ve el cliente es el nombre comercial del emisor. Si la empresa no configuró
 * su correo, no se envía nada y se devuelve el motivo.
 */
export async function enviarCorreoEmisor(idEmisor: number, destino: string, asunto: string, html: string, adjuntos: Adjunto[] = []): Promise<string | null> {
  const c = await cuentaDelEmisor(idEmisor);
  if (!c) return SIN_CORREO_EMISOR;
  return enviarCon(c, destino, asunto, html, adjuntos);
}

/** Correo del sistema (recuperar clave, avisos): primera cuenta de cuentas_correo, como la app anterior */
export async function enviarCorreo(destino: string, asunto: string, html: string, adjuntos: Adjunto[] = []): Promise<string | null> {
  const [cuenta] = await sql<{ direccion: string; nombre_mostrar: string; servidor: string; puerto: number; ssl: boolean; clave: string }[]>`
    select direccion, nombre_mostrar, servidor, puerto, ssl, clave from cuentas_correo order by id limit 1`;
  if (!cuenta) return 'No hay cuenta de correo del sistema configurada';
  return enviarCon({
    direccion: cuenta.direccion, nombre: cuenta.nombre_mostrar, servidor: cuenta.servidor, puerto: cuenta.puerto,
    seguridad: cuenta.puerto === 465 ? 'SSL' : cuenta.ssl ? 'STARTTLS' : 'OPCIONAL', usuario: cuenta.direccion, clave: cuenta.clave,
  }, destino, asunto, html, adjuntos);
}

export async function registrarLog(mensaje: string) {
  try {
    await sql`insert into log (fecha, mensaje) values (now() at time zone 'America/Guayaquil', ${mensaje.slice(0, 4000)})`;
  } catch {
    /* sin log */
  }
}
