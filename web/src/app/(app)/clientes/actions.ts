'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { ajustarTipoIdentificacion, validarIdentificacion, emailValido, provinciaDeIdentificacion } from '@/lib/validaciones';
import { PROVINCIAS, cantonesDe, direccionDeUbicacion } from '@/lib/ubicacion';

export type EstadoForm = { error?: string; ok?: string };

/** Valida y guarda un cliente del emisor (crear si no trae id). Devuelve el id o el error. */
async function guardarDatosCliente(form: FormData): Promise<{ error: string } | { id: number }> {
  const s = await requerirEmisor();
  const id = entero(form.get('id'));
  const datos = {
    nombre_cliente: texto(form.get('nombre_cliente')).toUpperCase(),
    tipo_identificacion: entero(form.get('tipo_identificacion')) ?? 0,
    tipo_cliente: entero(form.get('tipo_cliente')) ?? 1,
    identificacion: texto(form.get('identificacion')),
    telefono_fijo: texto(form.get('telefono_fijo')) || null,
    telefono_movil: texto(form.get('telefono_movil')) || null,
    direccion: texto(form.get('direccion')).toUpperCase() || null,
    provincia: texto(form.get('provincia')).toUpperCase() || null,
    ciudad: texto(form.get('ciudad')).toUpperCase() || null,
    correo: texto(form.get('correo')).toUpperCase() || null,
    codigo: texto(form.get('codigo')) || null,
  };
  if (!datos.nombre_cliente) return { error: 'Ingrese el nombre o razón social' };
  datos.tipo_identificacion = ajustarTipoIdentificacion(datos.tipo_identificacion, datos.identificacion);
  const errId = validarIdentificacion(datos.tipo_identificacion, datos.identificacion);
  if (errId) return { error: errId };
  // Provincia: la elegida, o la de su cédula/RUC. La dirección no es obligatoria para el SRI:
  // si no la dio, se usa «CIUDAD, PROVINCIA».
  if (datos.provincia && !PROVINCIAS.some((p) => p.nombre === datos.provincia)) datos.provincia = null;
  if (!datos.provincia) datos.provincia = provinciaDeIdentificacion(datos.identificacion);
  if (datos.ciudad && !cantonesDe(datos.provincia).includes(datos.ciudad)) datos.ciudad = null;
  if (!datos.direccion) datos.direccion = direccionDeUbicacion(datos.ciudad, datos.provincia);
  if (datos.correo) {
    const malos = datos.correo.split(/[;,]/).map((x) => x.trim()).filter((x) => x && !emailValido(x));
    if (malos.length) return { error: `Correo no válido: ${malos.join(', ')}` };
  }
  const dup = await sql`
    select id from clientes
    where id_emisor = ${s.emisorId} and identificacion = ${datos.identificacion} and tipo_cliente = ${datos.tipo_cliente}
      ${id ? sql`and id <> ${id}` : sql``}
    limit 1`;
  if (dup.length) return { error: 'Ya existe un cliente de ese tipo con esa identificación' };

  if (id) {
    const r = await sql`
      update clientes set ${sql(datos)}, fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id} and id_emisor = ${s.emisorId} returning id`;
    if (!r.length) return { error: 'Cliente no encontrado' };
    revalidatePath('/clientes');
    return { id };
  }
  const [r] = await sql<{ id: number }[]>`
    insert into clientes ${sql({ ...datos, id_emisor: s.emisorId })}
    returning id`;
  revalidatePath('/clientes');
  return { id: r.id };
}

export async function guardarCliente(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = await guardarDatosCliente(form);
  if ('error' in r) return { error: r.error };
  const volver = texto(form.get('volver'));
  redirect(volver || `/clientes/${r.id}?guardado=1`);
}

/** Guardado desde la ventana emergente de los comprobantes: no redirige, devuelve el id guardado */
export async function guardarClienteVentana(form: FormData): Promise<{ error?: string; id?: number }> {
  try {
    const r = await guardarDatosCliente(form);
    return 'error' in r ? { error: r.error } : { id: r.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
