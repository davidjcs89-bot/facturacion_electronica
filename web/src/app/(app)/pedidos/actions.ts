'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, decimal, texto } from '@/lib/params';
import { enviarCorreo } from '@/lib/correo';
import { ESTADO } from '@/lib/constantes';
import { PEDIDO, agregarLineaDoc, actualizarLineaDoc, eliminarLineaDoc, convertirAFactura } from '../proformas/_comun/lineas';
import { generarPdfPedido } from '../proformas/_comun/datos';
import type { EstadoForm } from '../proformas/_comun/EditorLineas';

async function propio(id: number, soloPendiente = false) {
  const s = await requerirEmisor();
  const [p] = await sql<{ estado: number }[]>`select estado from pedido where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!p) throw new Error('Pedido no encontrado');
  if (soloPendiente && p.estado !== ESTADO.PENDIENTE) throw new Error('El pedido ya no está pendiente y no se puede modificar');
  return s;
}
const ref = (id: number) => revalidatePath(`/pedidos/${id}`);

async function numeroPedido(idCliente: number) {
  const [r] = await sql<{ codigo: string | null; n: number }[]>`
    select (select codigo from clientes where id = ${idCliente}) codigo, (select count(*) from pedido where id_cliente = ${idCliente}) + 1 n`;
  return `${r.codigo || '0'}-${r.n}`;
}

async function validarCliente(cliente: number, emisorId: number) {
  if (cliente === 1) return true;
  const [ok] = await sql`select 1 from clientes where id = ${cliente} and id_emisor = ${emisorId}`;
  return !!ok;
}

export async function crearPedido(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const cliente = entero(form.get('id_cliente'));
  const punto = entero(form.get('id_punto_emision'));
  if (!cliente || !(await validarCliente(cliente, s.emisorId))) return { mensaje: 'Elija un cliente válido' };
  const [okP] = punto ? await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}` : [];
  if (!okP) return { mensaje: 'Elija el punto de emisión' };
  const [p] = await sql<{ id: number }[]>`
    insert into pedido (id_emisor, id_cliente, id_punto_emison, numero, estado)
    values (${s.emisorId}, ${cliente}, ${punto}, ${await numeroPedido(cliente)}, ${ESTADO.PENDIENTE}) returning id`;
  redirect(`/pedidos/${p.id}`);
}

export async function actualizarPedido(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const id = Number(form.get('id'));
    const s = await propio(id, true);
    const cliente = entero(form.get('id_cliente'));
    const punto = entero(form.get('id_punto_emision'));
    if (!cliente || !(await validarCliente(cliente, s.emisorId))) return { mensaje: 'Cliente no válido' };
    const [okP] = punto ? await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}` : [];
    if (!okP) return { mensaje: 'Punto de emisión no válido' };
    const [actual] = await sql<{ id_cliente: number }[]>`select id_cliente from pedido where id = ${id}`;
    const numero = actual.id_cliente === cliente ? null : await numeroPedido(cliente);
    await sql`update pedido set id_cliente = ${cliente}, id_punto_emison = ${punto},
      ${numero ? sql`numero = ${numero},` : sql``} fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
    ref(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarLineaPedido(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = Number(form.get('id'));
  try {
    const s = await propio(id, true);
    const idProducto = entero(form.get('id_producto'));
    if (!idProducto) return { mensaje: 'Elija un producto' };
    await agregarLineaDoc(PEDIDO, id, s.emisorId, idProducto, decimal(form.get('cantidad')) ?? 0, decimal(form.get('precio')),
      decimal(form.get('descuento')) ?? 0, texto(form.get('adicional')) || null);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    ref(id);
  }
}

export async function actualizarLineaPedido(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = Number(form.get('id'));
  try {
    await propio(id, true);
    const precio = decimal(form.get('precio'));
    if (precio == null) return { mensaje: 'Precio no válido' };
    await actualizarLineaDoc(PEDIDO, id, Number(form.get('id_linea')), decimal(form.get('cantidad')) ?? 0, precio,
      decimal(form.get('descuento')) ?? 0, texto(form.get('adicional')) || null);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    ref(id);
  }
}

export async function eliminarLineaPedido(form: FormData) {
  const id = Number(form.get('id'));
  await propio(id, true);
  await eliminarLineaDoc(PEDIDO, id, Number(form.get('id_linea')));
  ref(id);
}

export async function agregarAbono(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const id = Number(form.get('id'));
  try {
    await propio(id);
    const valor = decimal(form.get('valor'));
    if (valor == null || valor <= 0) return { mensaje: 'El monto debe ser mayor a cero' };
    await sql`insert into abonos_pedido (id_pedido, fecha, valor, descripcion)
      values (${id}, now() at time zone 'America/Guayaquil', ${valor}, ${texto(form.get('descripcion')).slice(0, 500) || null})`;
    await sql`update pedido set fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
    return { ok: true, mensaje: 'Abono registrado' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    ref(id);
  }
}

export async function eliminarAbono(form: FormData) {
  const id = Number(form.get('id'));
  await propio(id);
  await sql`delete from abonos_pedido where id = ${Number(form.get('id_abono'))} and id_pedido = ${id}`;
  ref(id);
}

export async function cambiarEstadoPedido(form: FormData) {
  const id = Number(form.get('id'));
  await propio(id);
  const estado = Number(form.get('estado'));
  if (![ESTADO.PENDIENTE, ESTADO.FINALIZADO, ESTADO.ANULADO].includes(estado as 1 | 3 | 8)) return;
  await sql`update pedido set estado = ${estado}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
  ref(id);
  revalidatePath('/pedidos');
}

export async function convertirPedido(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  let destino = '';
  try {
    const id = Number(form.get('id'));
    const s = await propio(id);
    const [x] = await sql<{ estado: number }[]>`select estado from pedido where id = ${id}`;
    if (x.estado === ESTADO.ANULADO) return { mensaje: 'El pedido está anulado' };
    const punto = entero(form.get('id_punto_emision'));
    if (!punto) return { mensaje: 'Elija el punto de emisión' };
    const idFactura = await convertirAFactura(PEDIDO, id, s.emisorId, punto);
    await sql`update pedido set estado = ${ESTADO.FINALIZADO}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
    revalidatePath('/facturas');
    destino = `/facturas/${idFactura}/editar`;
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}

export async function enviarPedido(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const id = Number(form.get('id'));
    const s = await propio(id);
    const correo = texto(form.get('correo'));
    if (!correo) return { mensaje: 'Ingrese el correo de destino' };
    const { pdf, numero, emisor, cliente, total } = await generarPdfPedido(id, s.emisorId);
    const err = await enviarCorreo(correo, `${emisor} Pedido #${numero}`,
      `<p>Estimado(a) ${cliente}</p><p>Adjunto encontrará el pedido N.º ${numero} por un valor de $${total.toFixed(2)}.</p><p>Atentamente,</p><p>${emisor}</p>`,
      [{ nombre: `Pedido-${numero}.pdf`, contenido: pdf, tipo: 'application/pdf' }]);
    return err ? { mensaje: err } : { ok: true, mensaje: 'Pedido enviado' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function eliminarPedido(form: FormData) {
  const id = Number(form.get('id'));
  await propio(id, true);
  await sql.begin(async (tx) => {
    await tx`delete from detalle_pedido where id_pedido = ${id}`;
    await tx`delete from abonos_pedido where id_pedido = ${id}`;
    await tx`delete from pedido where id = ${id}`;
  });
  revalidatePath('/pedidos');
  redirect('/pedidos');
}
