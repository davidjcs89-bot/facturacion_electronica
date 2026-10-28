'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { enviarCorreo } from '@/lib/correo';
import { PROFORMA, agregarLineaDoc, actualizarLineaDoc, eliminarLineaDoc, convertirAFactura } from './_comun/lineas';
import { generarPdfProforma } from './_comun/datos';
import type { EstadoForm } from './_comun/EditorLineas';

async function propia(id: number) {
  const s = await requerirEmisor();
  const [p] = await sql<{ id: number }[]>`select id from proforma where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!p) throw new Error('Proforma no encontrada');
  return s;
}

const ref = (id: number) => revalidatePath(`/proformas/${id}`);

export async function crearProforma(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const cliente = entero(form.get('id_cliente'));
  const fecha = texto(form.get('fecha_emision'));
  if (!cliente) return { mensaje: 'Elija el cliente' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  if (cliente !== 1) {
    const [ok] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
    if (!ok) return { mensaje: 'Cliente no válido' };
  }
  const [p] = await sql<{ id: number }[]>`
    insert into proforma (id_emisor, id_cliente, fecha_emision, observaiones, numero)
    values (${s.emisorId}, ${cliente}, ${fecha}::timestamp, ${texto(form.get('observaciones')).slice(0, 100) || ' '},
      (select coalesce(max(numero), 0) + 1 from proforma where id_emisor = ${s.emisorId}))
    returning id`;
  redirect(`/proformas/${p.id}`);
}

export async function actualizarProforma(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const id = Number(form.get('id'));
    const s = await propia(id);
    const cliente = entero(form.get('id_cliente'));
    const fecha = texto(form.get('fecha_emision'));
    if (!cliente || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Complete cliente y fecha' };
    if (cliente !== 1) {
      const [ok] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${s.emisorId}`;
      if (!ok) return { mensaje: 'Cliente no válido' };
    }
    await sql`update proforma set id_cliente = ${cliente}, fecha_emision = ${fecha}::timestamp,
      observaiones = ${texto(form.get('observaciones')).slice(0, 100) || ' '} where id = ${id}`;
    ref(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarLineaProforma(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = Number(form.get('id'));
  try {
    const s = await propia(id);
    const idProducto = entero(form.get('id_producto'));
    if (!idProducto) return { mensaje: 'Elija un producto' };
    await agregarLineaDoc(PROFORMA, id, s.emisorId, idProducto, decimal(form.get('cantidad')) ?? 0, decimal(form.get('precio')),
      decimal(form.get('descuento')) ?? 0, texto(form.get('adicional')) || null);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    ref(id);
  }
}

export async function actualizarLineaProforma(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = Number(form.get('id'));
  try {
    await propia(id);
    const precio = decimal(form.get('precio'));
    if (precio == null) return { mensaje: 'Precio no válido' };
    await actualizarLineaDoc(PROFORMA, id, Number(form.get('id_linea')), decimal(form.get('cantidad')) ?? 0, precio,
      decimal(form.get('descuento')) ?? 0, texto(form.get('adicional')) || null);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    ref(id);
  }
}

export async function eliminarLineaProforma(form: FormData) {
  const id = Number(form.get('id'));
  await propia(id);
  await eliminarLineaDoc(PROFORMA, id, Number(form.get('id_linea')));
  ref(id);
}

export async function eliminarProforma(form: FormData) {
  const id = Number(form.get('id'));
  await propia(id);
  await sql.begin(async (tx) => {
    await tx`delete from detalle_proforma where id_proforma = ${id}`;
    await tx`delete from proforma where id = ${id}`;
  });
  revalidatePath('/proformas');
  redirect('/proformas');
}

export async function convertirProforma(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  let destino = '';
  try {
    const id = Number(form.get('id'));
    const s = await propia(id);
    const punto = entero(form.get('id_punto_emision'));
    if (!punto) return { mensaje: 'Elija el punto de emisión' };
    const idFactura = await convertirAFactura(PROFORMA, id, s.emisorId, punto);
    revalidatePath('/facturas');
    destino = `/facturas/${idFactura}/editar`;
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}

export async function enviarProforma(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const id = Number(form.get('id'));
    const s = await propia(id);
    const correo = texto(form.get('correo'));
    if (!correo) return { mensaje: 'Ingrese el correo de destino' };
    const { pdf, numero, emisor, cliente, total } = await generarPdfProforma(id, s.emisorId);
    const err = await enviarCorreo(correo, `${emisor} Proforma #${numero}`,
      `<p>Estimado(a) ${cliente}</p><p>Adjunto encontrará la proforma N.º ${numero} por un valor de $${Number(total).toFixed(2)}.</p><p>Atentamente,</p><p>${emisor}</p>`,
      [{ nombre: `Proforma-${numero}.pdf`, contenido: pdf, tipo: 'application/pdf' }]);
    return err ? { mensaje: err } : { ok: true, mensaje: 'Proforma enviada' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}
