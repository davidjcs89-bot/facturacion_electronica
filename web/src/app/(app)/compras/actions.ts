'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import { moverStock } from '../bodegas/_comun/stock';
import { leerFacturaProveedor, type FacturaProveedor } from './_comun/xml';

export type EstadoForm = { ok?: boolean; mensaje?: string };
export type EstadoXml = EstadoForm & { factura?: FacturaProveedor; existentes?: Record<string, { nombre: string; precio: number }> };

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

/** Paso 1: lee el XML y devuelve la vista previa */
export async function leerXml(_p: EstadoXml, form: FormData): Promise<EstadoXml> {
  const s = await requerirEmisor();
  const archivo = form.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) return { mensaje: 'Elija el archivo XML' };
  if (archivo.size > 2 * 1024 * 1024) return { mensaje: 'Archivo demasiado grande' };
  let factura: FacturaProveedor;
  try {
    factura = leerFacturaProveedor(await archivo.text());
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  if (factura.claveAcceso) {
    const [dup] = await sql<{ id: number }[]>`select id from compra where id_emisor = ${s.emisorId} and clave = ${factura.claveAcceso} and estado <> 8`;
    if (dup) return { mensaje: `Esta factura ya fue importada (compra N.º ${dup.id})` };
  }
  const codigos = factura.detalles.map((d) => d.codigo);
  const prods = await sql<{ codigo: string; nombre: string; precio: number }[]>`
    select codigo, nombre, precio from producto where id_emisor = ${s.emisorId} and codigo = any(${codigos})`;
  return { ok: true, factura, existentes: Object.fromEntries(prods.map((p) => [p.codigo, { nombre: p.nombre, precio: Number(p.precio) }])) };
}

type Tx = Parameters<typeof moverStock>[0];

async function proveedor(tx: Tx, emisorId: number, ruc: string, nombre: string, dir: string) {
  const [c] = await tx<{ id: number }[]>`select id from clientes where id_emisor = ${emisorId} and identificacion = ${ruc} order by (tipo_cliente = 4) desc, id limit 1`;
  if (c) return c.id;
  const [n] = await tx<{ id: number }[]>`
    insert into clientes (id_emisor, nombre_cliente, identificacion, direccion, tipo_identificacion, tipo_cliente)
    values (${emisorId}, ${nombre.toUpperCase().slice(0, 200)}, ${ruc}, ${dir.toUpperCase().slice(0, 200) || null}, ${ruc.length === 13 ? 1 : 2}, 4)
    returning id`;
  return n.id;
}

/** Paso 2: guarda la compra importada, crea/actualiza productos y suma stock (igual que CompraBusiness.GuardarCompra) */
export async function guardarCompraXml(_p: EstadoXml, form: FormData): Promise<EstadoXml> {
  const s = await requerirEmisor();
  let factura: FacturaProveedor;
  try {
    factura = JSON.parse(String(form.get('factura')));
  } catch {
    return { mensaje: 'Datos no válidos; vuelva a cargar el XML' };
  }
  const bodega = entero(form.get('id_bodega'));
  const actualizar = form.get('actualizar_productos') === 'on';
  if (!bodega) return { mensaje: 'Elija la bodega de ingreso' };
  const [okB] = await sql`select 1 from bodegas where id = ${bodega} and id_emisor = ${s.emisorId}`;
  if (!okB) return { mensaje: 'Bodega no válida' };
  const [emisor] = await sql<{ id_impuesto_iva_actual: number }[]>`select id_impuesto_iva_actual from emisor where id = ${s.emisorId}`;
  let id = 0;
  try {
    id = await sql.begin(async (tx) => {
      if (factura.claveAcceso) {
        const [dup] = await tx`select 1 from compra where id_emisor = ${s.emisorId} and clave = ${factura.claveAcceso} and estado <> 8`;
        if (dup) throw new Error('Esta factura ya fue importada');
      }
      const idProv = await proveedor(tx, s.emisorId, factura.ruc, factura.razonSocial, factura.dirMatriz);
      const [c] = await tx<{ id: number }[]>`
        insert into compra (id_emisor, fecha, numero, clave, id_cliente, total_sin_impuestos, total_descuento, total, estado, id_bodega)
        values (${s.emisorId}, ${factura.fechaEmision}::timestamp, ${factura.numero.slice(0, 20)}, ${factura.claveAcceso || null}, ${idProv},
          ${factura.totalSinImpuestos}, ${factura.totalDescuento}, ${factura.total}, 1, ${bodega})
        returning id`;
      for (const i of factura.impuestos) {
        await tx`insert into impuestos_compra (id_compra, codigo, codigo_porcentaje, base_imponible, valor)
          values (${c.id}, ${i.codigo}, ${i.codigoPorcentaje}, ${r2(i.baseImponible)}, ${i.valor})`;
      }
      for (let k = 0; k < factura.detalles.length; k++) {
        const d = factura.detalles[k];
        const cantidad = Math.round(d.cantidad);
        const [det] = await tx<{ id: number }[]>`
          insert into detalle_compra (id_compra, codigo, descripcion, cantidad, precio, descuento, precio_sin_impuestos)
          values (${c.id}, ${d.codigo.slice(0, 50)}, ${d.descripcion.slice(0, 200)}, ${cantidad}, ${r4(d.precioUnitario)}, ${d.descuento}, ${d.precioTotalSinImpuesto})
          returning id`;
        for (const i of d.impuestos) {
          await tx`insert into impuesto_detalle_compra (id_detalle, codigo, codigo_porcentaje, tarifa, base_imponible, valor)
            values (${det.id}, ${i.codigo}, ${i.codigoPorcentaje}, ${i.tarifa}, ${i.baseImponible}, ${i.valor})`;
        }
        // Producto: precio de venta (sin IVA) indicado en la vista previa
        const pv = Number(String(form.get(`pv_${k}`) ?? '').replace(',', '.'));
        const precioVenta = Number.isFinite(pv) && pv > 0 ? pv : d.precioUnitario;
        const [prod] = await tx<{ id: number }[]>`select id from producto where id_emisor = ${s.emisorId} and codigo = ${d.codigo.slice(0, 30)} order by id limit 1`;
        let idProd: number;
        if (prod) {
          idProd = prod.id;
          if (actualizar) {
            await tx`update producto set costo_producto = ${r4(d.precioUnitario)}, precio = ${r4(precioVenta)}, nombre = ${d.descripcion.slice(0, 1000)},
              fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${idProd}`;
          } else {
            await tx`update producto set costo_producto = ${r4(d.precioUnitario)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${idProd}`;
          }
        } else {
          const [n] = await tx<{ id: number }[]>`
            insert into producto (codigo, codigo_auxiliar, tipo_producto, nombre, precio, codigo_iva, codigo_ice, codigo_irbpnr, id_emisor, costo_producto, cantidad_producto)
            values (${d.codigo.slice(0, 30)}, ${d.codigo.slice(0, 100)}, 1, ${d.descripcion.slice(0, 1000)}, ${r4(precioVenta)},
              ${emisor.id_impuesto_iva_actual}, 99, 100, ${s.emisorId}, ${r4(d.precioUnitario)}, ${cantidad})
            returning id`;
          idProd = n.id;
        }
        await moverStock(tx, idProd, bodega, cantidad);
      }
      return c.id;
    });
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  revalidatePath('/compras');
  redirect(`/compras/${id}`);
}

/** Compra manual: lineas JSON [{id_producto, cantidad, costo}] con costo unitario sin IVA */
export async function guardarCompraManual(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const prov = entero(form.get('id_cliente'));
  const bodega = entero(form.get('id_bodega'));
  const numero = texto(form.get('numero'));
  const fecha = texto(form.get('fecha'));
  let lineas: { id_producto: number; cantidad: number; costo: number }[] = [];
  try { lineas = JSON.parse(String(form.get('lineas') ?? '[]')); } catch { return { mensaje: 'Detalle no válido' }; }
  if (!prov) return { mensaje: 'Elija el proveedor' };
  if (!bodega) return { mensaje: 'Elija la bodega' };
  if (!numero) return { mensaje: 'Ingrese el número de la factura del proveedor' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { mensaje: 'Fecha no válida' };
  if (!lineas.length) return { mensaje: 'Agregue productos' };
  if (lineas.some((l) => !Number.isInteger(l.cantidad) || l.cantidad <= 0 || !(l.costo >= 0))) return { mensaje: 'Cantidades o costos no válidos' };
  const [okP] = await sql`select 1 from clientes where id = ${prov} and id_emisor = ${s.emisorId}`;
  const [okB] = await sql`select 1 from bodegas where id = ${bodega} and id_emisor = ${s.emisorId}`;
  if (!okP || !okB) return { mensaje: 'Proveedor o bodega no válidos' };
  const ids = [...new Set(lineas.map((l) => Number(l.id_producto)))];
  const prods = await sql<{ id: number; codigo: string; nombre: string; iva_codigo: string; iva_pct: number }[]>`
    select p.id, p.codigo, p.nombre, iva.codigo iva_codigo, iva.porcentaje iva_pct
    from producto p join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    where p.id_emisor = ${s.emisorId} and p.id = any(${ids})`;
  if (prods.length !== ids.length) return { mensaje: 'Hay productos que no pertenecen al emisor' };
  let id = 0;
  try {
    id = await sql.begin(async (tx) => {
      const grupos = new Map<string, { base: number; valor: number }>();
      let sub = 0;
      let iva = 0;
      const calc = lineas.map((l) => {
        const p = prods.find((x) => x.id === Number(l.id_producto))!;
        const base = r2(l.cantidad * l.costo);
        const v = r2(base * Number(p.iva_pct) / 100);
        sub += base;
        iva += v;
        const g = grupos.get(p.iva_codigo) ?? { base: 0, valor: 0 };
        g.base += base;
        g.valor += v;
        grupos.set(p.iva_codigo, g);
        return { l, p, base, v };
      });
      const [c] = await tx<{ id: number }[]>`
        insert into compra (id_emisor, fecha, numero, clave, id_cliente, total_sin_impuestos, total_descuento, total, estado, id_bodega)
        values (${s.emisorId}, ${fecha}::timestamp, ${numero.slice(0, 20)}, ${texto(form.get('clave')) || null}, ${prov}, ${r2(sub)}, 0, ${r2(sub + iva)}, 1, ${bodega})
        returning id`;
      for (const [cod, g] of grupos) {
        await tx`insert into impuestos_compra (id_compra, codigo, codigo_porcentaje, base_imponible, valor) values (${c.id}, '2', ${cod}, ${r2(g.base)}, ${r2(g.valor)})`;
      }
      for (const { l, p, base, v } of calc) {
        const [det] = await tx<{ id: number }[]>`
          insert into detalle_compra (id_compra, codigo, descripcion, cantidad, precio, descuento, precio_sin_impuestos)
          values (${c.id}, ${p.codigo.slice(0, 50)}, ${p.nombre.slice(0, 200)}, ${l.cantidad}, ${r4(l.costo)}, 0, ${base}) returning id`;
        await tx`insert into impuesto_detalle_compra (id_detalle, codigo, codigo_porcentaje, tarifa, base_imponible, valor)
          values (${det.id}, '2', ${p.iva_codigo}, ${p.iva_pct}, ${base}, ${v})`;
        await tx`update producto set costo_producto = ${r4(l.costo)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${p.id}`;
        await moverStock(tx, p.id, bodega, l.cantidad);
      }
      return c.id;
    });
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
  revalidatePath('/compras');
  redirect(`/compras/${id}`);
}

/** Anula la compra y descuenta del stock lo que habia ingresado */
export async function anularCompra(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const s = await requerirEmisor();
    const id = Number(form.get('id'));
    await sql.begin(async (tx) => {
      const [c] = await tx<{ estado: number; id_bodega: number }[]>`select estado, id_bodega from compra where id = ${id} and id_emisor = ${s.emisorId} for update`;
      if (!c) throw new Error('Compra no encontrada');
      if (c.estado === 8) throw new Error('La compra ya está anulada');
      const det = await tx<{ codigo: string; cantidad: number }[]>`select codigo, cantidad from detalle_compra where id_compra = ${id}`;
      for (const d of det) {
        const [p] = await tx<{ id: number }[]>`select id from producto where id_emisor = ${s.emisorId} and codigo = ${d.codigo} order by id limit 1`;
        if (p) await moverStock(tx, p.id, c.id_bodega, -d.cantidad);
      }
      await tx`update compra set estado = 8 where id = ${id}`;
    });
    revalidatePath(`/compras/${id}`);
    revalidatePath('/compras');
    return { ok: true, mensaje: 'Compra anulada y stock revertido' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}
