'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { r2 } from '@/lib/comprobantes/calculos';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO } from '@/lib/constantes';

export type Estado = { ok?: boolean; mensaje?: string };

async function borrador(id: number) {
  const s = await requerirEmisor();
  const [r] = await sql<{ id: number; estado: number }[]>`
    select id, estado from retencion where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!r) throw new Error('Retención no encontrada');
  if (r.estado !== ESTADO.PENDIENTE && r.estado !== ESTADO.PAGADO) throw new Error('La retención ya fue finalizada y no se puede modificar');
  return { s, r };
}

function refrescar(id: number) {
  revalidatePath(`/retenciones/${id}/editar`);
}

async function validarSujeto(emisorId: number, id: number | null) {
  if (!id) return 'Elija el sujeto retenido';
  const [c] = await sql`select 1 from clientes where id = ${id} and id_emisor = ${emisorId}`;
  return c ? null : 'Sujeto retenido no válido';
}

async function validarPunto(emisorId: number, id: number | null) {
  if (!id) return 'Elija el punto de emisión';
  const [p] = await sql`select 1 from puntos_emisior where id = ${id} and id_emisor = ${emisorId}`;
  return p ? null : 'Punto de emisión no válido';
}

export async function crearRetencion(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const punto = entero(form.get('id_punto_emision'));
  const sujeto = entero(form.get('id_cliente'));
  const fecha = texto(form.get('fecha_emision'));
  const err = (await validarPunto(s.emisorId, punto)) ?? (await validarSujeto(s.emisorId, sujeto));
  if (err) return { mensaje: err };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  const [r] = await sql<{ id: number }[]>`
    insert into retencion (id_emisor, id_cliente, id_punto_emision, fecha_emision, numero, clave_acceso, estado)
    values (${s.emisorId}, ${sujeto}, ${punto}, ${fecha}::timestamp, '', '', ${ESTADO.PENDIENTE})
    returning id`;
  redirect(`/retenciones/${r.id}/editar`);
}

export async function actualizarCabecera(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const punto = entero(form.get('id_punto_emision'));
    const sujeto = entero(form.get('id_cliente'));
    const fecha = texto(form.get('fecha_emision'));
    const err = (await validarPunto(s.emisorId, punto)) ?? (await validarSujeto(s.emisorId, sujeto));
    if (err) return { mensaje: err };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
    await sql`
      update retencion set id_cliente = ${sujeto}, id_punto_emision = ${punto}, fecha_emision = ${fecha}::timestamp,
        fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id}`;
    refrescar(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarImpuesto(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const tipoDoc = entero(form.get('id_tipo_documento')) ?? 1;
    const numero = texto(form.get('numero_documento')).replace(/-/g, '');
    const fechaDoc = texto(form.get('fecha_documento'));
    const idPorcentaje = entero(form.get('id_porcentaje'));
    const base = decimal(form.get('base_imponible'));
    const pctManual = decimal(form.get('porcentaje'));
    if (!/^\d{15}$/.test(numero)) return { mensaje: 'El número del documento sustento debe tener 15 dígitos (001-001-000000001)' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDoc)) return { mensaje: 'Fecha del documento sustento no válida' };
    if (!idPorcentaje) return { mensaje: 'Elija el código de retención' };
    if (base == null || base <= 0) return { mensaje: 'La base imponible debe ser mayor a cero' };
    const [pr] = await sql<{ id_impuesto: number; porcentaje: number; porcentaje_fijo: boolean }[]>`
      select id_impuesto, porcentaje, porcentaje_fijo from impuesto_porcentaje_retencion where id = ${idPorcentaje}`;
    if (!pr?.id_impuesto) return { mensaje: 'Código de retención no válido' };
    const pct = pr.porcentaje_fijo ? Number(pr.porcentaje) : pctManual;
    if (pct == null || pct < 0 || pct > 100) return { mensaje: 'Ingrese el porcentaje de retención' };
    await sql`
      insert into detalle_retencion ${sql({
        id_retencion: id,
        id_tipo_documento: tipoDoc,
        numero_documento_ret: numero,
        fecha_emision: fechaDoc,
        id_impuesto: pr.id_impuesto,
        id_porcentajes_retenccion: idPorcentaje,
        base_imponible: r2(base),
        porcentaje_retencion: pct,
        valor_retenido: r2(base * (pct / 100)),
        periodo_fiscal: `${fechaDoc.slice(0, 4)}/${fechaDoc.slice(5, 7)}`,
      })}`;
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarImpuesto(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from detalle_retencion where id = ${Number(form.get('id_detalle'))} and id_retencion = ${id}`;
  refrescar(id);
}

export async function agregarAdicional(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const nombre = texto(form.get('nombre'));
    const descripcion = texto(form.get('descripcion'));
    if (!nombre || !descripcion) return { mensaje: 'Complete nombre y descripción' };
    await sql`insert into datos_adicionales_retencion (id_retencion, nombre, descripcion) values (${id}, ${nombre.slice(0, 50)}, ${descripcion.slice(0, 300)})`;
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarAdicional(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from datos_adicionales_retencion where id = ${Number(form.get('id_adicional'))} and id_retencion = ${id}`;
  refrescar(id);
}

export async function eliminarBorrador(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql.begin(async (tx) => {
    await tx`delete from detalle_retencion where id_retencion = ${id}`;
    await tx`delete from datos_adicionales_retencion where id_retencion = ${id}`;
    await tx`delete from retencion where id = ${id}`;
  });
  revalidatePath('/retenciones');
  redirect('/retenciones');
}

export async function emitirRetencion(_p: Estado, form: FormData): Promise<Estado> {
  const id = Number(form.get('id'));
  let destino: string | null = null;
  try {
    const { s } = await borrador(id);
    const [r] = await sql<{ id_cliente: number | null; lineas: number }[]>`
      select id_cliente, (select count(*) from detalle_retencion where id_retencion = r.id) lineas from retencion r where r.id = ${id}`;
    if (!r.id_cliente) return { mensaje: 'Elija el sujeto retenido' };
    if (!r.lineas) return { mensaje: 'Agregue al menos un impuesto retenido' };
    const res = await emitir(6, id, s.emisorId);
    revalidatePath('/retenciones');
    if (res.estado > 0) destino = `/retenciones/${id}`;
    if (!destino) return { mensaje: res.mensaje };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
