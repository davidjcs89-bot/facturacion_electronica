'use server';
import { revalidatePath } from 'next/cache';
import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { emailValido } from '@/lib/validaciones';
import { enviarCorreo } from '@/lib/correo';
import type { EstadoForm } from '../_comun/Msg';

export async function guardarCuenta(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  await requerirAdminSistema();
  const id = entero(form.get('id'));
  const d = {
    direccion: texto(form.get('direccion')).toLowerCase(),
    nombre_mostrar: texto(form.get('nombre_mostrar')),
    servidor: texto(form.get('servidor')),
    puerto: entero(form.get('puerto')) ?? 587,
    ssl: form.get('ssl') === 'on',
  };
  const clave = String(form.get('clave') ?? '');
  if (!emailValido(d.direccion)) return { mensaje: 'Dirección de correo no válida' };
  if (!d.nombre_mostrar) return { mensaje: 'Ingrese el nombre que verán los destinatarios' };
  if (!d.servidor) return { mensaje: 'Ingrese el servidor SMTP' };
  if (d.puerto < 1 || d.puerto > 65535) return { mensaje: 'Puerto no válido' };
  if (!id && !clave) return { mensaje: 'Ingrese la clave de la cuenta' };
  if (id) {
    await sql`update cuentas_correo set ${sql(d)} ${clave ? sql`, clave = ${clave}` : sql``} where id = ${id}`;
  } else {
    await sql`insert into cuentas_correo ${sql({ ...d, clave })}`;
  }
  revalidatePath('/admin/correos');
  return { ok: true, mensaje: 'Cuenta guardada' };
}

export async function eliminarCuenta(form: FormData) {
  await requerirAdminSistema();
  await sql`delete from cuentas_correo where id = ${Number(form.get('id'))}`;
  revalidatePath('/admin/correos');
}

/** Envia un correo de prueba con la cuenta principal (la primera) */
export async function probarCorreo(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  await requerirAdminSistema();
  const destino = texto(form.get('destino'));
  if (!emailValido(destino)) return { mensaje: 'Correo de destino no válido' };
  const err = await enviarCorreo(destino, 'Prueba de correo - Facturación Electrónica', '<p>Este es un correo de prueba enviado desde la app de facturación.</p>');
  return err ? { mensaje: `No se pudo enviar: ${err}` } : { ok: true, mensaje: 'Correo de prueba enviado' };
}
