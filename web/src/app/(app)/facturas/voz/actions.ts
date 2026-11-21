'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { calcularLinea } from '@/lib/comprobantes/calculos';
import { recalcularFactura } from '@/lib/comprobantes/factura';
import { emitir } from '@/lib/comprobantes/procesar';
import { ESTADO, ID_CONSUMIDOR_FINAL, MONTO_MAXIMO_CONSUMIDOR_FINAL, TIPO_IDENTIFICACION } from '@/lib/constantes';
import { validarIdentificacion, emailValido, provinciaDeIdentificacion } from '@/lib/validaciones';
import { hoyEcuadorISO } from '@/lib/formato';
import { interpretarDictado, type BorradorVoz } from '@/lib/voz/interpretar';
import { vozHabilitada } from '@/lib/voz/habilitada';

export type Resumen = {
  lineas: { producto_id: number; nombre: string; codigo: string; cantidad: number; precio: number; total: number }[];
  subtotal: number; iva: number; total: number;
};
export type RespuestaVoz = { ok: true; borrador: BorradorVoz; resumen: Resumen } | { ok: false; mensaje: string };

async function sesionVoz() {
  const s = await requerirEmisor();
  if (!vozHabilitada(s.emisorId)) throw new Error('La facturación por voz no está activada para esta empresa');
  return s;
}

type Prod = { id: number; codigo: string; nombre: string; precio: number; iva: number; ice: number; irbpnr: number };

async function productosDe(emisorId: number, ids: number[]) {
  if (!ids.length) return new Map<number, Prod>();
  const filas = await sql<Prod[]>`
    select p.id, p.codigo, p.nombre, p.precio::float precio, iva.porcentaje::float iva, ice.porcentaje::float ice, irb.porcentaje::float irbpnr
    from producto p
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where p.id_emisor = ${emisorId} and p.id in ${sql(ids)}`;
  return new Map(filas.map((p) => [p.id, p]));
}

/** Totales del borrador con el mismo cálculo que la factura normal */
async function resumir(emisorId: number, b: BorradorVoz): Promise<Resumen> {
  const ps = await productosDe(emisorId, b.lineas.map((l) => l.producto_id).filter(Boolean) as number[]);
  const lineas: Resumen['lineas'] = [];
  let subtotal = 0, iva = 0, total = 0;
  for (const l of b.lineas) {
    const p = l.producto_id ? ps.get(l.producto_id) : undefined;
    if (!p) continue;
    const imp = { ivaPct: p.iva, icePct: p.ice, irbpnrPct: p.irbpnr };
    const c = l.precio_con_iva != null ? calcularLinea(l.precio_con_iva, l.cantidad, l.descuento_pct, imp, true) : calcularLinea(p.precio, l.cantidad, l.descuento_pct, imp, false);
    lineas.push({ producto_id: p.id, nombre: p.nombre, codigo: p.codigo, cantidad: l.cantidad, precio: Math.round(c.precio_unitario * (1 + p.iva / 100) * 100) / 100, total: c.total });
    subtotal += c.sub_total; iva += c.valor_iva + c.valor_ice + c.valor_irbpnr; total += c.total;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { lineas, subtotal: r2(subtotal), iva: r2(iva), total: r2(total) };
}

/** Interpreta lo dictado (o una respuesta sobre el borrador actual) */
export async function interpretar(dictado: string, previo: BorradorVoz | null): Promise<RespuestaVoz> {
  try {
    const s = await sesionVoz();
    const texto = dictado.trim().slice(0, 2000);
    if (!texto) return { ok: false, mensaje: 'No se escuchó nada. Intente de nuevo.' };
    const borrador = await interpretarDictado(s.emisorId, texto, previo);
    return { ok: true, borrador, resumen: await resumir(s.emisorId, borrador) };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

/** Recalcula después de que la persona toca una opción (sin llamar a Claude) */
export async function recalcular(b: BorradorVoz): Promise<RespuestaVoz> {
  try {
    const s = await sesionVoz();
    return { ok: true, borrador: b, resumen: await resumir(s.emisorId, b) };
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message };
  }
}

/**
 * Crea la factura con el borrador y, si modo = 'emitir', la emite como la factura normal.
 * modo 'editar' la deja en borrador y abre el editor de siempre.
 */
export async function crearDesdeVoz(b: BorradorVoz, idPunto: number, modo: 'emitir' | 'editar'): Promise<{ mensaje: string }> {
  let destino: string;
  try {
    const s = await sesionVoz();
    const [okPunto] = await sql`select 1 from puntos_emisior where id = ${idPunto} and id_emisor = ${s.emisorId}`;
    if (!okPunto) return { mensaje: 'Punto de emisión no válido' };
    const lineas = b.lineas.filter((l) => l.producto_id);
    if (!lineas.length) return { mensaje: 'Falta al menos un producto' };
    if (lineas.length !== b.lineas.length) return { mensaje: 'Hay productos sin elegir: toque la opción correcta' };
    if (modo === 'emitir' && !b.forma_pago_id) return { mensaje: 'Falta la forma de pago' };
    const resumen = await resumir(s.emisorId, b);

    // Cliente: existente, consumidor final o nuevo dictado
    let idCliente = b.cliente.id;
    if (!idCliente && b.cliente.nuevo) {
      const n = b.cliente.nuevo;
      if (!n.nombre?.trim()) return { mensaje: 'Falta el nombre del cliente nuevo.' };
      const tipo = n.identificacion.length === 13 ? TIPO_IDENTIFICACION.RUC : TIPO_IDENTIFICACION.CEDULA;
      const err = validarIdentificacion(tipo, n.identificacion);
      if (err) return { mensaje: `Cliente nuevo: ${err}` };
      const correo = n.correo && emailValido(n.correo) ? n.correo.toUpperCase() : null;
      const [ya] = await sql<{ id: number }[]>`select id from clientes where id_emisor = ${s.emisorId} and identificacion = ${n.identificacion} and tipo_cliente = 1 limit 1`;
      if (ya) idCliente = ya.id;
      else {
        const [c] = await sql<{ id: number }[]>`
          insert into clientes ${sql({ id_emisor: s.emisorId, nombre_cliente: n.nombre.toUpperCase(), tipo_identificacion: tipo, tipo_cliente: 1, identificacion: n.identificacion, correo, direccion: provinciaDeIdentificacion(n.identificacion), provincia: provinciaDeIdentificacion(n.identificacion) })}
          returning id`;
        idCliente = c.id;
      }
    }
    if (!idCliente) return { mensaje: 'Falta el cliente' };
    if (idCliente !== ID_CONSUMIDOR_FINAL) {
      const [ok] = await sql`select 1 from clientes where id = ${idCliente} and id_emisor = ${s.emisorId}`;
      if (!ok) return { mensaje: 'Cliente no válido' };
    } else if (resumen.total >= MONTO_MAXIMO_CONSUMIDOR_FINAL) {
      return { mensaje: `Una factura a Consumidor Final debe ser menor a $${MONTO_MAXIMO_CONSUMIDOR_FINAL}: diga o elija el cliente` };
    }
    if (b.forma_pago_id) {
      const [ok] = await sql`select 1 from formas_de_pago where id = ${b.forma_pago_id}`;
      if (!ok) return { mensaje: 'Forma de pago no válida' };
    }

    const ps = await productosDe(s.emisorId, lineas.map((l) => l.producto_id!) as number[]);
    const id = await sql.begin(async (tx) => {
      const [f] = await tx<{ id: number }[]>`
        insert into factura (id_emisor, id_cliente, id_punto_emison, fecha_emision, numero, clave_de_acceso, estado, desde_proforma, es_mayorista)
        values (${s.emisorId}, ${idCliente}, ${idPunto}, ${hoyEcuadorISO()}::timestamp, '', '', ${ESTADO.PENDIENTE}, false, false)
        returning id`;
      for (const l of lineas) {
        const p = ps.get(l.producto_id!)!;
        const imp = { ivaPct: p.iva, icePct: p.ice, irbpnrPct: p.irbpnr };
        const c = l.precio_con_iva != null ? calcularLinea(l.precio_con_iva, l.cantidad, l.descuento_pct, imp, true) : calcularLinea(p.precio, l.cantidad, l.descuento_pct, imp, false);
        await tx`insert into detalle_factura ${tx({ id_factura: f.id, id_producto: p.id, ...c, adicional: null })}`;
        await tx`update productos_x_bodega set stock = stock - ${l.cantidad}
          where id_producto = ${p.id} and id_bodega = (select id_bodega from puntos_emisior where id = ${idPunto})`;
      }
      return f.id;
    });
    await recalcularFactura(id);
    if (b.forma_pago_id) {
      const [t] = await sql<{ total: number }[]>`select total::float total from factura where id = ${id}`;
      await sql`insert into detalle_pago_factura (id_factura, id_form_pago, valor, plazo, timpo) values (${id}, ${b.forma_pago_id}, ${t.total}, ${null}, 'NINGUNO')`;
      await sql`update factura set estado = ${ESTADO.PAGADO} where id = ${id}`;
    }
    revalidatePath('/facturas');
    if (modo === 'editar') destino = `/facturas/${id}/editar`;
    else {
      const r = await emitir(1, id, s.emisorId);
      if (r.estado <= 0) destino = `/facturas/${id}/editar`;
      else destino = `/facturas/${id}${r.estado !== ESTADO.NO_AUTORIZADO ? '?imprimir=1' : ''}`;
    }
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  redirect(destino);
}
