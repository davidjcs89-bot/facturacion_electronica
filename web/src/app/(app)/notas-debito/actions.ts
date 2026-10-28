'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { recalcularNotaDebito } from '@/lib/comprobantes/nota_debito';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO } from '@/lib/constantes';

export type Estado = { ok?: boolean; mensaje?: string };

async function borrador(id: number) {
  const s = await requerirEmisor();
  const [n] = await sql<{ id: number; estado: number }[]>`
    select id, estado from nota_debito where id = ${id} and id_emisior = ${s.emisorId}`;
  if (!n) throw new Error('Nota de débito no encontrada');
  if (n.estado !== ESTADO.PENDIENTE && n.estado !== ESTADO.PAGADO) throw new Error('La nota de débito ya fue finalizada y no se puede modificar');
  return { s, n };
}

function refrescar(id: number) {
  revalidatePath(`/notas-debito/${id}/editar`);
}

async function ivaValido(id: number | null) {
  if (!id) return false;
  const [r] = await sql`select 1 from porcentaje_impuesto_producto where id = ${id} and id_impuesto in (1, 4)`;
  return !!r;
}

export async function crearNotaDebito(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const idFactura = entero(form.get('id_factura'));
  const punto = entero(form.get('id_punto_emision'));
  const fecha = texto(form.get('fecha_emision'));
  const iva = entero(form.get('id_porcentaje_iva'));
  const razon = texto(form.get('razon'));
  const valor = decimal(form.get('valor'));
  if (!idFactura) return { mensaje: 'Elija la factura a modificar' };
  if (!punto) return { mensaje: 'Elija el punto de emisión' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  if (!(await ivaValido(iva))) return { mensaje: 'Elija la tarifa de IVA' };
  if (razon && (valor == null || valor <= 0)) return { mensaje: 'Ingrese un valor mayor a cero para el motivo' };
  const [f] = await sql<{ id: number; id_cliente: number; numero: string; fecha_emision: Date; estado: number }[]>`
    select id, id_cliente, numero, fecha_emision, estado from factura where id = ${idFactura} and id_emisor = ${s.emisorId}`;
  if (!f) return { mensaje: 'Factura no encontrada' };
  if (f.estado !== ESTADO.AUTORIZADO) return { mensaje: 'Solo se pueden emitir notas de débito sobre facturas autorizadas' };
  const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
  if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
  const [n] = await sql<{ id: number }[]>`
    insert into nota_debito (id_emisior, id_cliente, id_punto_emision, fecha_emision, numero, clave_acceso, estado,
      numero_factura_modifica, fecha_factura_modifica, id_factura_modifica, id_porcentaje_iva)
    values (${s.emisorId}, ${f.id_cliente}, ${punto}, ${fecha}::timestamp, '', '', ${ESTADO.PENDIENTE},
      ${f.numero}, ${f.fecha_emision}, ${f.id}, ${iva})
    returning id`;
  if (razon && valor) {
    await sql`insert into detalle_nota_debito (id_nota_debito, razon_modificacion, valor_modificacion) values (${n.id}, ${razon.slice(0, 200)}, ${valor})`;
    await recalcularNotaDebito(n.id);
  }
  redirect(`/notas-debito/${n.id}/editar`);
}

export async function actualizarCabecera(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const punto = entero(form.get('id_punto_emision'));
    const fecha = texto(form.get('fecha_emision'));
    const iva = entero(form.get('id_porcentaje_iva'));
    if (!punto || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Complete punto de emisión y fecha' };
    if (!(await ivaValido(iva))) return { mensaje: 'Tarifa de IVA no válida' };
    const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
    if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
    await sql`
      update nota_debito set id_punto_emision = ${punto}, fecha_emision = ${fecha}::timestamp, id_porcentaje_iva = ${iva},
        fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id}`;
    await recalcularNotaDebito(id);
    refrescar(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarMotivo(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const razon = texto(form.get('razon'));
    const valor = decimal(form.get('valor'));
    if (!razon) return { mensaje: 'Ingrese la razón de la modificación' };
    if (valor == null || valor <= 0) return { mensaje: 'Ingrese un valor mayor a cero' };
    await sql`insert into detalle_nota_debito (id_nota_debito, razon_modificacion, valor_modificacion) values (${id}, ${razon.slice(0, 200)}, ${Math.round(valor * 100) / 100})`;
    await recalcularNotaDebito(id);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarMotivo(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from detalle_nota_debito where id = ${Number(form.get('id_motivo'))} and id_nota_debito = ${id}`;
  await recalcularNotaDebito(id);
  refrescar(id);
}

export async function agregarPago(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const forma = entero(form.get('id_forma_pago'));
    let valor = decimal(form.get('valor'));
    const plazo = entero(form.get('plazo'));
    const tiempo = texto(form.get('timpo')) || 'NINGUNO';
    if (!forma) return { mensaje: 'Elija la forma de pago' };
    if (valor == null) {
      const [r] = await sql<{ pendiente: number }[]>`
        select n.total - coalesce((select sum(valor) from detalle_pago_nota_debito where id_nota_debito = n.id), 0) pendiente
        from nota_debito n where n.id = ${id}`;
      valor = Number(r.pendiente);
    }
    if (valor <= 0) return { mensaje: 'El valor del pago debe ser mayor a cero' };
    await sql`insert into detalle_pago_nota_debito (id_nota_debito, id_forma_pago, valor, plazo, timpo) values (${id}, ${forma}, ${valor}, ${plazo}, ${tiempo})`;
    await sql`update nota_debito set estado = ${ESTADO.PAGADO} where id = ${id}`;
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarPago(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from detalle_pago_nota_debito where id = ${Number(form.get('id_pago'))} and id_nota_debito = ${id}`;
  await sql`update nota_debito set estado = ${ESTADO.PENDIENTE} where id = ${id} and not exists (select 1 from detalle_pago_nota_debito where id_nota_debito = ${id})`;
  refrescar(id);
}

export async function agregarAdicional(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const nombre = texto(form.get('nombre'));
    const descripcion = texto(form.get('descripcion'));
    if (!nombre || !descripcion) return { mensaje: 'Complete nombre y descripción' };
    await sql`insert into datos_adicionales_nota_debito (id_nota_debito, nombre, descripcion) values (${id}, ${nombre.slice(0, 50)}, ${descripcion.slice(0, 300)})`;
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
  await sql`delete from datos_adicionales_nota_debito where id = ${Number(form.get('id_adicional'))} and id_nota_debito = ${id}`;
  refrescar(id);
}

export async function eliminarBorrador(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql.begin(async (tx) => {
    await tx`delete from detalle_nota_debito where id_nota_debito = ${id}`;
    await tx`delete from detalle_pago_nota_debito where id_nota_debito = ${id}`;
    await tx`delete from datos_adicionales_nota_debito where id_nota_debito = ${id}`;
    await tx`delete from nota_debito where id = ${id}`;
  });
  revalidatePath('/notas-debito');
  redirect('/notas-debito');
}

export async function emitirNotaDebito(_p: Estado, form: FormData): Promise<Estado> {
  const id = Number(form.get('id'));
  let destino: string | null = null;
  try {
    const { s } = await borrador(id);
    const [r] = await sql<{ total: number; motivos: number; pagos: number; suma_pagos: number; fecha_previa: boolean }[]>`
      select n.total, n.fecha_emision::date < n.fecha_factura_modifica::date fecha_previa,
        (select count(*) from detalle_nota_debito where id_nota_debito = n.id) motivos,
        (select count(*) from detalle_pago_nota_debito where id_nota_debito = n.id) pagos,
        (select coalesce(sum(valor), 0) from detalle_pago_nota_debito where id_nota_debito = n.id) suma_pagos
      from nota_debito n where n.id = ${id}`;
    if (!r.motivos) return { mensaje: 'Agregue al menos un motivo con su valor' };
    if (!r.pagos) return { mensaje: 'Agregue la forma de pago' };
    if (Math.abs(Number(r.suma_pagos) - Number(r.total)) > 0.009) {
      return { mensaje: `La suma de los pagos ($${Number(r.suma_pagos).toFixed(2)}) no coincide con el total ($${Number(r.total).toFixed(2)})` };
    }
    if (r.fecha_previa) return { mensaje: 'La fecha de la nota no puede ser anterior a la de la factura' };
    const res = await emitir(4, id, s.emisorId);
    revalidatePath('/notas-debito');
    if (res.estado > 0) destino = `/notas-debito/${id}`;
    if (!destino) return { mensaje: res.mensaje };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
