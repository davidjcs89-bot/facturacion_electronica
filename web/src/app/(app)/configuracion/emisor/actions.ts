'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requerirSesion, requerirEmisor, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { guardarSesion } from '@/lib/session';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { leerCertificado } from '@/lib/sri/firma';
import { cifrar } from '@/lib/cifrado';
import { rucValido } from '@/lib/validaciones';

export type Estado = { ok?: boolean; mensaje?: string };

function datosForm(form: FormData) {
  return {
    ruc: texto(form.get('ruc')),
    razon_social: texto(form.get('razon_social')).toUpperCase(),
    nombre_comercial: texto(form.get('nombre_comercial')).toUpperCase(),
    direccion_matriz: texto(form.get('direccion_matriz')).toUpperCase(),
    obligado_conta: form.get('obligado_conta') === 'on',
    cintirbuyente_especial: form.get('cintirbuyente_especial') === 'on',
    numero_con_especial: texto(form.get('numero_con_especial')) || null,
    tipo_ambiente: entero(form.get('tipo_ambiente')) ?? 1,
    id_impuesto_iva_actual: entero(form.get('id_impuesto_iva_actual')) ?? 101,
    adicionales_comprobantes: texto(form.get('adicionales_comprobantes')) || null,
    control_inventario: form.get('control_inventario') === 'on',
  };
}

function validar(d: ReturnType<typeof datosForm>): string | null {
  if (!rucValido(d.ruc)) return 'El RUC debe tener 13 dígitos';
  if (!d.razon_social) return 'Ingrese la razón social';
  if (d.razon_social.length > 40 || d.nombre_comercial.length > 40) return 'Razón social y nombre comercial: máximo 40 caracteres';
  if (!d.nombre_comercial) return 'Ingrese el nombre comercial';
  if (!d.direccion_matriz) return 'Ingrese la dirección matriz';
  if (d.cintirbuyente_especial && !d.numero_con_especial) return 'Ingrese el número de contribuyente especial';
  return null;
}

/** Actualiza los datos del emisor de la sesion */
export async function guardarEmisor(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const d = datosForm(form);
  const err = validar(d);
  if (err) return { mensaje: err };
  await sql`update emisor set ${sql(d)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${s.emisorId}`;
  revalidatePath('/', 'layout');
  return { ok: true, mensaje: 'Datos del emisor guardados' };
}

/** Crea el emisor para un usuario que aun no tiene (primer ingreso) */
export async function crearEmisor(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirSesion();
  if (s.emisorId) return { mensaje: 'Ya tiene un emisor configurado' };
  const d = datosForm(form);
  const err = validar(d);
  if (err) return { mensaje: err };
  const [e] = await sql<{ id: number }[]>`
    insert into emisor ${sql({ ...d, contrasena: '', estado: 1 })} returning id`;
  await sql`insert into emisor_habilitacion (id_emisor, fecha_desde, fecha_hasta)
    values (${e.id}, now() at time zone 'America/Guayaquil', (now() at time zone 'America/Guayaquil') + interval '1 year')`;
  if (s.rol !== ROL_ADMIN_SISTEMA) await sql`update usuario set id_emisor = ${e.id} where id = ${s.uid}`;
  await guardarSesion({ ...s, emisorId: e.id });
  redirect('/configuracion/puntos-emision');
}

const MAX_FIRMA = 200 * 1024;
const MAX_LOGO = 400 * 1024;

export async function subirFirma(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const archivo = form.get('archivo');
  const clave = String(form.get('clave') ?? '');
  if (!(archivo instanceof File) || archivo.size === 0) return { mensaje: 'Elija el archivo de firma (.p12 o .pfx)' };
  if (archivo.size > MAX_FIRMA) return { mensaje: 'El archivo es demasiado grande para ser una firma electrónica' };
  if (!clave) return { mensaje: 'Ingrese la clave de la firma' };
  const bytes = Buffer.from(await archivo.arrayBuffer());
  let cert;
  try {
    cert = leerCertificado(bytes, clave);
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  if (cert.validoHasta < new Date()) return { mensaje: `La firma venció el ${cert.validoHasta.toLocaleDateString('es-EC')}` };
  await sql`
    insert into firma_emisor (id_emisor, archivo, nombre_archivo, clave_cifrada, titular, valido_desde, valido_hasta)
    values (${s.emisorId}, ${bytes}, ${archivo.name}, ${cifrar(clave)}, ${cert.titular}, ${cert.validoDesde}, ${cert.validoHasta})
    on conflict (id_emisor) do update set archivo = excluded.archivo, nombre_archivo = excluded.nombre_archivo,
      clave_cifrada = excluded.clave_cifrada, titular = excluded.titular, valido_desde = excluded.valido_desde,
      valido_hasta = excluded.valido_hasta, fecha_carga = now() at time zone 'America/Guayaquil'`;
  revalidatePath('/configuracion/emisor');
  return { ok: true, mensaje: `Firma de ${cert.titular} cargada (válida hasta ${cert.validoHasta.toLocaleDateString('es-EC')})` };
}

export async function subirLogo(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const archivo = form.get('logo');
  if (!(archivo instanceof File) || archivo.size === 0) return { mensaje: 'Elija una imagen PNG o JPG' };
  if (archivo.size > MAX_LOGO) return { mensaje: 'El logo no debe superar 400 KB' };
  const bytes = Buffer.from(await archivo.arrayBuffer());
  const esPng = bytes.subarray(0, 4).toString('hex') === '89504e47';
  const esJpg = bytes.subarray(0, 2).toString('hex') === 'ffd8';
  if (!esPng && !esJpg) return { mensaje: 'Formato no soportado: use PNG o JPG' };
  await sql`
    insert into logo_emisor (id_emisor, contenido, tipo_mime) values (${s.emisorId}, ${bytes}, ${esPng ? 'image/png' : 'image/jpeg'})
    on conflict (id_emisor) do update set contenido = excluded.contenido, tipo_mime = excluded.tipo_mime,
      fecha_carga = now() at time zone 'America/Guayaquil'`;
  revalidatePath('/configuracion/emisor');
  return { ok: true, mensaje: 'Logo actualizado' };
}

export async function quitarLogo() {
  const s = await requerirEmisor();
  await sql`delete from logo_emisor where id_emisor = ${s.emisorId}`;
  revalidatePath('/configuracion/emisor');
}
