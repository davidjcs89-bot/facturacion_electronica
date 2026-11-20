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
  responder_a?: string | null; // a donde llegan las respuestas del cliente
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

export async function enviarCon(c: CuentaSmtp, destino: string, asunto: string, html: string, adjuntos: Adjunto[]): Promise<string | null> {
  const destinos = destinosDe(destino);
  if (!destinos.length) return 'Sin destinatario';
  try {
    await transporte(c).sendMail({
      from: { name: c.nombre, address: c.direccion },
      to: destinos,
      ...(c.copia_a ? { bcc: c.copia_a } : {}),
      ...(c.responder_a ? { replyTo: c.responder_a } : {}),
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
export async function cuentaDelEmisor(idEmisor: number): Promise<(CuentaSmtp & { verificado: boolean }) | null> {
  const [c] = await sql<{
    direccion: string; servidor: string; puerto: number; seguridad: 'SSL' | 'STARTTLS';
    usuario: string; clave_cifrada: string; copia_a: string | null; nombre_comercial: string; verificado_en: Date | null;
  }[]>`
    select c.direccion, c.servidor, c.puerto, c.seguridad, c.usuario, c.clave_cifrada, c.copia_a, e.nombre_comercial, c.verificado_en
    from emisor_correo c join emisor e on e.id = c.id_emisor
    where c.id_emisor = ${idEmisor}`;
  if (!c) return null;
  return {
    direccion: c.direccion, nombre: c.nombre_comercial, servidor: c.servidor, puerto: c.puerto,
    seguridad: c.seguridad, usuario: c.usuario, clave: descifrar(c.clave_cifrada), copia_a: c.copia_a,
    verificado: !!c.verificado_en,
  };
}

/**
 * Envía un correo de una empresa (comprobantes, proformas, pedidos).
 * Regla (decidida por David el 20/11/2026):
 * - Si la empresa configuró su correo y lo verificó con el correo de prueba, sale SOLO desde el de la empresa.
 * - Si no lo configuró, aún no lo verificó, o el envío por su correo falla, sale desde el correo general
 *   del sistema (respaldo), mostrando el nombre comercial de la empresa y con «responder a» su correo.
 */
export async function enviarCorreoEmisor(idEmisor: number, destino: string, asunto: string, html: string, adjuntos: Adjunto[] = []): Promise<string | null> {
  let c: (CuentaSmtp & { verificado: boolean }) | null = null;
  try {
    c = await cuentaDelEmisor(idEmisor);
  } catch {
    c = null; // tabla o clave no disponibles: se usa la cuenta general
  }
  if (c?.verificado) {
    const error = await enviarCon(c, destino, asunto, html, adjuntos);
    if (!error) return null;
    await registrarLog(`Correo de la empresa ${idEmisor} falló (${error}); se envió por el correo del sistema a ${destino}`);
  }
  let nombre: string | null = c?.nombre ?? null;
  if (!nombre) {
    try {
      const [e] = await sql<{ n: string }[]>`select coalesce(nullif(nombre_comercial, ''), razon_social) n from emisor where id = ${idEmisor}`;
      nombre = e?.n ?? null;
    } catch { nombre = null; }
  }
  return enviarCorreo(destino, asunto, html, adjuntos, { nombre, responder_a: c?.direccion ?? null, copia_a: c?.copia_a ?? null });
}

/** Correo del sistema (recuperar clave, avisos): primera cuenta de cuentas_correo, como la app anterior */
export async function enviarCorreo(
  destino: string, asunto: string, html: string, adjuntos: Adjunto[] = [],
  como?: { nombre?: string | null; responder_a?: string | null; copia_a?: string | null },
): Promise<string | null> {
  const [cuenta] = await sql<{ direccion: string; nombre_mostrar: string; servidor: string; puerto: number; ssl: boolean; clave: string }[]>`
    select direccion, nombre_mostrar, servidor, puerto, ssl, clave from cuentas_correo order by id limit 1`;
  if (!cuenta) return 'No hay cuenta de correo del sistema configurada';
  return enviarCon({
    direccion: cuenta.direccion, nombre: como?.nombre || cuenta.nombre_mostrar, servidor: cuenta.servidor, puerto: cuenta.puerto,
    seguridad: cuenta.puerto === 465 ? 'SSL' : cuenta.ssl ? 'STARTTLS' : 'OPCIONAL', usuario: cuenta.direccion, clave: cuenta.clave,
    responder_a: como?.responder_a ?? null, copia_a: como?.copia_a ?? null,
  }, destino, asunto, html, adjuntos);
}

export async function registrarLog(mensaje: string) {
  try {
    await sql`insert into log (fecha, mensaje) values (now() at time zone 'America/Guayaquil', ${mensaje.slice(0, 4000)})`;
  } catch {
    /* sin log */
  }
}
