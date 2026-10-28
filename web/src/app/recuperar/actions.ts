'use server';
import { randomInt } from 'node:crypto';
import { sql } from '@/lib/db';
import { cifrarClave } from '@/lib/auth';
import { enviarCorreo, registrarLog } from '@/lib/correo';
import { emailValido } from '@/lib/validaciones';

export type EstadoRecuperar = { ok?: boolean; mensaje?: string; paso?: 'codigo' | 'listo'; correo?: string };

const RESPUESTA = 'Si el correo está registrado, recibirá un código de seguridad válido por 24 horas.';

export async function solicitarCodigo(_p: EstadoRecuperar, form: FormData): Promise<EstadoRecuperar> {
  const correo = String(form.get('correo') ?? '').trim().toLowerCase();
  if (!emailValido(correo)) return { mensaje: 'Ingrese un correo válido' };
  const [u] = await sql<{ id: number; nombre_usuario: string; recientes: number }[]>`
    select u.id, u.nombre_usuario,
      (select count(*) from codigos_seguridad c where c.id_usuario = u.id
         and c.fecha_generacion > (now() at time zone 'America/Guayaquil') - interval '1 hour') recientes
    from usuario u where lower(u.correo) = ${correo} and u.estado = 1 order by u.id desc limit 1`;
  if (u && u.recientes < 3) {
    const codigo = String(randomInt(100000, 1000000));
    await sql`insert into codigos_seguridad (codigo, id_usuario, fecha_generacion, fecha_caducidad, cambio_clave)
      values (${codigo}, ${u.id}, now() at time zone 'America/Guayaquil', (now() at time zone 'America/Guayaquil') + interval '1 day', false)`;
    const err = await enviarCorreo(
      correo,
      'Recuperación de clave - Facturación Electrónica',
      `<p>Su usuario es: <strong>${u.nombre_usuario}</strong></p><p>Su código de seguridad para cambiar la clave es: <strong>${codigo}</strong></p>` +
        `<p>El código vence en 24 horas. Si usted no lo solicitó, ignore este correo.</p>`,
    );
    if (err) await registrarLog(`Recuperar clave ${u.id}: ${err}`);
  }
  return { ok: true, mensaje: RESPUESTA, paso: 'codigo', correo };
}

export async function cambiarClave(_p: EstadoRecuperar, form: FormData): Promise<EstadoRecuperar> {
  const correo = String(form.get('correo') ?? '').trim().toLowerCase();
  const codigo = String(form.get('codigo') ?? '').trim();
  const clave = String(form.get('clave') ?? '');
  const confirmacion = String(form.get('confirmacion') ?? '');
  const base = { paso: 'codigo' as const, correo };
  if (!/^\d{6}$/.test(codigo)) return { ...base, mensaje: 'El código tiene 6 dígitos' };
  if (clave.length < 6) return { ...base, mensaje: 'La clave debe tener al menos 6 caracteres' };
  if (clave !== confirmacion) return { ...base, mensaje: 'Las claves no coinciden' };
  const [c] = await sql<{ id: number; id_usuario: number }[]>`
    select c.id, c.id_usuario from codigos_seguridad c join usuario u on u.id = c.id_usuario
    where c.codigo = ${codigo} and lower(u.correo) = ${correo} and not c.cambio_clave
      and c.fecha_caducidad > now() at time zone 'America/Guayaquil'
    order by c.id desc limit 1`;
  if (!c) return { ...base, mensaje: 'Código de seguridad incorrecto o caducado' };
  await sql.begin(async (tx) => {
    await tx`update usuario set clave = ${cifrarClave(clave)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${c.id_usuario}`;
    await tx`update codigos_seguridad set cambio_clave = true where id_usuario = ${c.id_usuario} and not cambio_clave`;
  });
  return { ok: true, paso: 'listo', mensaje: 'Su clave fue actualizada. Ya puede ingresar.' };
}
