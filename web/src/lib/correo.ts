import 'server-only';
import nodemailer from 'nodemailer';
import { sql } from './db';

type Adjunto = { nombre: string; contenido: Buffer | Uint8Array | string; tipo?: string };

/** Envia un correo con la primera cuenta configurada en cuentas_correo (igual que la app anterior). */
export async function enviarCorreo(destino: string, asunto: string, html: string, adjuntos: Adjunto[] = []): Promise<string | null> {
  const [cuenta] = await sql<{ direccion: string; nombre_mostrar: string; servidor: string; puerto: number; ssl: boolean; clave: string }[]>`
    select direccion, nombre_mostrar, servidor, puerto, ssl, clave from cuentas_correo order by id limit 1`;
  if (!cuenta) return 'No hay cuenta de correo configurada';
  const destinos = destino.split(/[;,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!destinos.length) return 'Sin destinatario';
  try {
    const transporte = nodemailer.createTransport({
      host: cuenta.servidor,
      port: cuenta.puerto,
      secure: cuenta.puerto === 465,
      requireTLS: cuenta.ssl && cuenta.puerto !== 465,
      auth: { user: cuenta.direccion, pass: cuenta.clave },
      connectionTimeout: 15000,
    });
    await transporte.sendMail({
      from: { name: cuenta.nombre_mostrar, address: cuenta.direccion },
      to: destinos,
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
    return (e as Error).message;
  }
}

export async function registrarLog(mensaje: string) {
  try {
    await sql`insert into log (fecha, mensaje) values (now() at time zone 'America/Guayaquil', ${mensaje.slice(0, 4000)})`;
  } catch {
    /* sin log */
  }
}
