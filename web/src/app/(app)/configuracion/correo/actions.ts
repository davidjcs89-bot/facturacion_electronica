'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { emailValido } from '@/lib/validaciones';
import { cifrar } from '@/lib/cifrado';
import { cuentaDelEmisor, enviarCorreoEmisor, servidorPermitido, verificarCuenta, registrarLog } from '@/lib/correo';

export type Estado = { ok?: boolean; mensaje?: string };

const PUERTOS = [465, 587, 25, 2525];

/** Guarda el correo de envío de la empresa de la sesión. Antes de guardar, prueba la conexión. */
export async function guardarCorreoEmisor(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const direccion = texto(form.get('direccion')).toLowerCase();
  const servidor = texto(form.get('servidor')).toLowerCase();
  const puerto = entero(form.get('puerto')) ?? 0;
  const seguridad = texto(form.get('seguridad')) === 'SSL' ? 'SSL' : 'STARTTLS';
  const usuario = texto(form.get('usuario')) || direccion;
  const copia = texto(form.get('copia_a')).toLowerCase();
  const claveNueva = String(form.get('clave') ?? '');

  if (!emailValido(direccion) || direccion.length > 254) return { mensaje: 'Correo remitente no válido' };
  if (!servidorPermitido(servidor)) return { mensaje: 'Servidor no válido (ej.: smtp.gmail.com)' };
  if (!PUERTOS.includes(puerto)) return { mensaje: 'Puerto no válido: use 465 (SSL) o 587 (STARTTLS)' };
  if (usuario.length > 254) return { mensaje: 'Usuario demasiado largo' };
  if (copia && (!emailValido(copia) || copia.length > 254)) return { mensaje: 'Correo de copia no válido' };
  if (claveNueva.length > 500) return { mensaje: 'Clave demasiado larga' };

  const anterior = await cuentaDelEmisor(s.emisorId);
  const clave = claveNueva || anterior?.clave || '';
  if (!clave) return { mensaje: 'Ingrese la clave (o contraseña de aplicación) de la cuenta' };

  const [e] = await sql<{ nombre_comercial: string }[]>`select nombre_comercial from emisor where id = ${s.emisorId}`;
  const error = await verificarCuenta({ direccion, nombre: e?.nombre_comercial ?? '', servidor, puerto, seguridad, usuario, clave });
  if (error) return { mensaje: `No se guardó: ${error}` };

  const fila = {
    id_emisor: s.emisorId, direccion, servidor, puerto, seguridad, usuario,
    clave_cifrada: cifrar(clave), copia_a: copia || null,
  };
  await sql`
    insert into emisor_correo ${sql(fila)}
    on conflict (id_emisor) do update set
      direccion = excluded.direccion, servidor = excluded.servidor, puerto = excluded.puerto,
      seguridad = excluded.seguridad, usuario = excluded.usuario, clave_cifrada = excluded.clave_cifrada,
      copia_a = excluded.copia_a, verificado_en = null,
      fecha_modificacion = now() at time zone 'America/Guayaquil'`;
  await registrarLog(`Correo de envío actualizado: emisor ${s.emisorId}, usuario ${s.uid}, ${direccion} vía ${servidor}:${puerto}`);
  revalidatePath('/configuracion/correo');
  return { ok: true, mensaje: 'Conexión correcta y datos guardados. Envíe un correo de prueba para terminar.' };
}

/** Envía un correo de prueba con la cuenta de la empresa y la marca como verificada */
export async function probarCorreoEmisor(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const destino = texto(form.get('destino')).toLowerCase();
  if (!emailValido(destino)) return { mensaje: 'Correo de destino no válido' };
  const err = await enviarCorreoEmisor(s.emisorId, destino, 'Correo de prueba - Facturación Electrónica',
    '<p>Este es un correo de prueba. Si lo recibió, su empresa ya puede enviar comprobantes desde esta cuenta.</p>');
  if (err) return { mensaje: `No se pudo enviar: ${err}` };
  await sql`update emisor_correo set verificado_en = now() at time zone 'America/Guayaquil' where id_emisor = ${s.emisorId}`;
  revalidatePath('/configuracion/correo');
  return { ok: true, mensaje: `Correo de prueba enviado a ${destino}` };
}

export async function quitarCorreoEmisor() {
  const s = await requerirEmisor();
  await sql`delete from emisor_correo where id_emisor = ${s.emisorId}`;
  await registrarLog(`Correo de envío eliminado: emisor ${s.emisorId}, usuario ${s.uid}`);
  revalidatePath('/configuracion/correo');
}
