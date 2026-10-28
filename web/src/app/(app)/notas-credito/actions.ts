'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { lineasFacturaOrigen, calcularLineaNC, recalcularNotaCredito } from '@/lib/comprobantes/nota_credito';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO } from '@/lib/constantes';

export type Estado = { ok?: boolean; mensaje?: string };

async function borrador(id: number) {
  const s = await requerirEmisor();
  const [n] = await sql<{ id: number; estado: number; id_factura_devolver: number }[]>`
    select id, estado, id_factura_devolver from nota_credito where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!n) throw new Error('Nota de crédito no encontrada');
  if (n.estado !== ESTADO.PENDIENTE && n.estado !== ESTADO.PAGADO) throw new Error('La nota de crédito ya fue finalizada y no se puede modificar');
  return { s, n };
}

function refrescar(id: number) {
  revalidatePath(`/notas-credito/${id}/editar`);
}

function fechaValida(f: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(f);
}

export async function crearNotaCredito(_p: Estado, form: FormData): Promise<Estado> {
  const s = await requerirEmisor();
  const idFactura = entero(form.get('id_factura'));
  const punto = entero(form.get('id_punto_emision'));
  const fecha = texto(form.get('fecha_emision'));
  const motivo = texto(form.get('motivo'));
  if (!idFactura) return { mensaje: 'Elija la factura a modificar' };
  if (!punto) return { mensaje: 'Elija el punto de emisión' };
  if (!fechaValida(fecha)) return { mensaje: 'Fecha no válida' };
  if (!motivo) return { mensaje: 'Ingrese el motivo de la nota de crédito' };
  const [f] = await sql<{ id: number; id_cliente: number; numero: string; fecha_emision: Date; estado: number }[]>`
    select id, id_cliente, numero, fecha_emision, estado from factura where id = ${idFactura} and id_emisor = ${s.emisorId}`;
  if (!f) return { mensaje: 'Factura no encontrada' };
  if (f.estado !== ESTADO.AUTORIZADO) return { mensaje: 'Solo se pueden emitir notas de crédito sobre facturas autorizadas' };
  if (fecha < f.fecha_emision.toISOString().slice(0, 10)) return { mensaje: 'La fecha no puede ser anterior a la de la factura' };
  const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
  if (!okPunto) return { mensaje: 'Punto de emisión no válido' };

  const origen = await lineasFacturaOrigen(idFactura);
  const lineas: ReturnType<typeof calcularLineaNC>[] = [];
  for (const o of origen) {
    if (form.get(`sel_${o.id}`) !== 'on') continue;
    const cant = Number(form.get(`cant_${o.id}`));
    const disponible = Number(o.cantidad) - Number(o.acreditado);
    if (!Number.isInteger(cant) || cant <= 0) return { mensaje: `Cantidad no válida para ${o.nombre}` };
    if (cant > disponible) return { mensaje: `${o.nombre}: solo quedan ${disponible} unidades por acreditar` };
    lineas.push(calcularLineaNC(o, cant));
  }
  if (!lineas.length) return { mensaje: 'Seleccione al menos un producto' };

  const id = await sql.begin(async (tx) => {
    const [n] = await tx<{ id: number }[]>`
      insert into nota_credito (id_emisor, id_cliente, id_punto_emision, fecha_emision, numero, clave_acceso, estado,
        fecha_emision_fc_mod, numero_fc_mod, motivo, id_factura_devolver)
      values (${s.emisorId}, ${f.id_cliente}, ${punto}, ${fecha}::timestamp, '', '', ${ESTADO.PENDIENTE},
        ${f.fecha_emision}, ${f.numero}, ${motivo.slice(0, 200)}, ${f.id})
      returning id`;
    for (const l of lineas) await tx`insert into detalle_nota_credito ${tx({ ...l, id_nota_credito: n.id })}`;
    return n.id;
  });
  await recalcularNotaCredito(id);
  redirect(`/notas-credito/${id}/editar`);
}

export async function actualizarCabecera(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { s } = await borrador(id);
    const punto = entero(form.get('id_punto_emision'));
    const fecha = texto(form.get('fecha_emision'));
    const motivo = texto(form.get('motivo'));
    if (!punto || !fechaValida(fecha)) return { mensaje: 'Complete punto de emisión y fecha' };
    if (!motivo) return { mensaje: 'Ingrese el motivo' };
    const [okPunto] = await sql`select 1 from puntos_emisior where id = ${punto} and id_emisor = ${s.emisorId}`;
    if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
    await sql`
      update nota_credito set id_punto_emision = ${punto}, fecha_emision = ${fecha}::timestamp, motivo = ${motivo.slice(0, 200)},
        fecha_modificacion = now() at time zone 'America/Guayaquil'
      where id = ${id}`;
    refrescar(id);
    return { ok: true, mensaje: 'Datos guardados' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

/** Agrega (o reemplaza) la linea de un producto de la factura con la cantidad indicada */
export async function guardarLinea(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    const { n } = await borrador(id);
    const idDetFactura = Number(form.get('id_detalle_factura'));
    const cant = Number(form.get('cantidad'));
    const origen = await lineasFacturaOrigen(n.id_factura_devolver, id);
    const o = origen.find((x) => x.id === idDetFactura);
    if (!o) return { mensaje: 'Elija un producto de la factura' };
    const disponible = Number(o.cantidad) - Number(o.acreditado);
    if (!Number.isInteger(cant) || cant <= 0) return { mensaje: 'Cantidad no válida' };
    if (cant > disponible) return { mensaje: `${o.nombre}: solo quedan ${disponible} unidades por acreditar` };
    const l = calcularLineaNC(o, cant);
    await sql.begin(async (tx) => {
      await tx`delete from detalle_nota_credito where id_nota_credito = ${id} and (id_detalle_factura = ${o.id} or (id_detalle_factura is null and id_producto = ${o.id_producto}))`;
      await tx`insert into detalle_nota_credito ${tx({ ...l, id_nota_credito: id })}`;
    });
    await recalcularNotaCredito(id);
    return { ok: true };
  } catch (e) {
    return { mensaje: (e as Error).message };
  } finally {
    refrescar(Number(form.get('id')));
  }
}

export async function eliminarLinea(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql`delete from detalle_nota_credito where id = ${Number(form.get('id_linea'))} and id_nota_credito = ${id}`;
  await recalcularNotaCredito(id);
  refrescar(id);
}

export async function agregarAdicional(_p: Estado, form: FormData): Promise<Estado> {
  try {
    const id = Number(form.get('id'));
    await borrador(id);
    const nombre = texto(form.get('nombre'));
    const descripcion = texto(form.get('descripcion'));
    if (!nombre || !descripcion) return { mensaje: 'Complete nombre y descripción' };
    await sql`insert into datos_adicionales_nota_credito (id_nota_credito, nombre, descripcion) values (${id}, ${nombre.slice(0, 50)}, ${descripcion.slice(0, 300)})`;
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
  await sql`delete from datos_adicionales_nota_credito where id = ${Number(form.get('id_adicional'))} and id_nota_credito = ${id}`;
  refrescar(id);
}

export async function eliminarBorrador(form: FormData) {
  const id = Number(form.get('id'));
  await borrador(id);
  await sql.begin(async (tx) => {
    await tx`delete from detalle_nota_credito where id_nota_credito = ${id}`;
    await tx`delete from datos_adicionales_nota_credito where id_nota_credito = ${id}`;
    await tx`delete from nota_credito where id = ${id}`;
  });
  revalidatePath('/notas-credito');
  redirect('/notas-credito');
}

export async function emitirNotaCredito(_p: Estado, form: FormData): Promise<Estado> {
  const id = Number(form.get('id'));
  let destino: string | null = null;
  try {
    const { s, n } = await borrador(id);
    const [r] = await sql<{ total: number; motivo: string; fecha_previa: boolean; lineas: number; factura_total: number; otras: number }[]>`
      select nc.total, nc.motivo, nc.fecha_emision::date < f.fecha_emision::date fecha_previa,
        (select count(*) from detalle_nota_credito where id_nota_credito = nc.id) lineas,
        f.total factura_total,
        coalesce((select sum(total) from nota_credito o where o.id_factura_devolver = f.id and o.id <> nc.id and o.estado not in (7, 8)), 0) otras
      from nota_credito nc join factura f on f.id = nc.id_factura_devolver
      where nc.id = ${n.id}`;
    if (!r.lineas) return { mensaje: 'Agregue al menos un producto' };
    if (!r.motivo || r.motivo.trim() === '.' || !r.motivo.trim()) return { mensaje: 'Ingrese el motivo de la nota de crédito' };
    if (r.fecha_previa) return { mensaje: 'La fecha de la nota no puede ser anterior a la de la factura' };
    const saldo = Number(r.factura_total) - Number(r.otras);
    if (Number(r.total) - saldo > 0.009) {
      return { mensaje: `El total de la nota ($${Number(r.total).toFixed(2)}) supera el saldo de la factura ($${saldo.toFixed(2)})` };
    }
    const res = await emitir(3, id, s.emisorId);
    revalidatePath('/notas-credito');
    if (res.estado > 0) destino = `/notas-credito/${id}`;
    if (!destino) return { mensaje: res.mensaje };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
