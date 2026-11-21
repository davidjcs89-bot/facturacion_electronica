import 'server-only';
import { sql } from './db';
import { manejador } from './comprobantes/registro';

/** Tipos de comprobante que se revisan (id de tipo_documento) */
export const TIPOS_REVISION = [1, 2, 3, 4, 5, 6];
/** Estados «con problema»: borrador, finalizado/firmado, recibido sin autorizar, no recibido, no autorizado */
export const ESTADOS_PROBLEMA = [1, 2, 3, 4, 5, 7];
/** Tarifas de IVA que ya no rigen (12 % y 14 %) y la vigente (15 %), ids de porcentaje_impuesto_producto */
export const IVA_ANTIGUOS = [2, 3];
export const IVA_VIGENTE = 101;

/** Condición SQL: fecha anterior a hoy en Ecuador */
export const antesDeHoy = (col: string) => sql`${sql(col)}::date < (now() at time zone 'America/Guayaquil')::date`;

export type ComprobanteRevision = {
  tipo: number; nombre: string; ruta: string; id: number; numero: string | null; fecha: Date; estado: number;
  clave: string | null; cliente: string | null; total: number | null; mensaje: string | null;
};

/** Comprobantes de días anteriores que quedaron sin autorizar (o borradores sin emitir) */
export async function comprobantesEnRevision(emisorId: number): Promise<ComprobanteRevision[]> {
  const partes = TIPOS_REVISION.map((t) => {
    const m = manejador(t);
    const extra = t === 1
      ? sql`(select c.nombre_cliente from clientes c where c.id = x.id_cliente) cliente, x.total::float total`
      : sql`null::text cliente, null::float total`;
    return sql`
      select ${t}::int tipo, x.id, nullif(x.${sql(m.colNumero)}, '') numero, x.${sql(m.colFecha)} fecha, x.estado,
        nullif(x.${sql(m.colClave)}, '') clave, ${extra},
        (select d.mensajes from documentos_electronicos d where d.id_tipo_comprobante = ${t} and d.id_comprobante = x.id order by d.id desc limit 1) mensaje
      from ${sql(m.tabla)} x
      where x.${sql(m.colEmisor)} = ${emisorId} and x.estado in ${sql(ESTADOS_PROBLEMA)} and ${antesDeHoy('x.' + m.colFecha)}`;
  });
  const union = partes.reduce((a, b) => sql`${a} union all ${b}`);
  const filas = await sql<Omit<ComprobanteRevision, 'nombre' | 'ruta'>[]>`select * from (${union}) u order by u.fecha desc, u.id desc limit 500`;
  return filas.map((f) => ({ ...f, nombre: manejador(f.tipo).nombre, ruta: manejador(f.tipo).ruta }));
}

export type ProductoRevision = { id: number; codigo: string; nombre: string; precio: number; tipo: number; motivos: string[] };

/** Productos (tipo 1) y servicios (tipo 2) con algo que corregir */
export async function productosEnRevision(emisorId: number): Promise<ProductoRevision[]> {
  const filas = await sql<{ id: number; codigo: string; nombre: string; precio: number; tipo: number; iva_antiguo: boolean; sin_precio: boolean; repetido: boolean; rechazado: boolean; iva: string }[]>`
    select p.id, p.codigo, p.nombre, coalesce(p.precio, 0)::float precio, p.tipo_producto tipo, iva.descripcion iva,
      p.codigo_iva in ${sql(IVA_ANTIGUOS)} iva_antiguo,
      coalesce(p.precio, 0) = 0 sin_precio,
      exists (select 1 from producto q where q.id_emisor = p.id_emisor and q.codigo = p.codigo and q.id <> p.id) repetido,
      exists (select 1 from detalle_factura d join factura f on f.id = d.id_factura
              where d.id_producto = p.id and f.id_emisor = p.id_emisor and f.estado in (5, 7)
                and f.fecha_emision > now() - interval '120 days') rechazado
    from producto p
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    where p.id_emisor = ${emisorId}
      and (p.codigo_iva in ${sql(IVA_ANTIGUOS)} or coalesce(p.precio, 0) = 0
        or exists (select 1 from producto q where q.id_emisor = p.id_emisor and q.codigo = p.codigo and q.id <> p.id)
        or exists (select 1 from detalle_factura d join factura f on f.id = d.id_factura
                   where d.id_producto = p.id and f.id_emisor = p.id_emisor and f.estado in (5, 7)
                     and f.fecha_emision > now() - interval '120 days'))
    order by p.codigo, p.id
    limit 500`;
  return filas.map((f) => ({
    id: f.id, codigo: f.codigo, nombre: f.nombre, precio: f.precio, tipo: f.tipo,
    motivos: [
      f.iva_antiguo && `IVA antiguo (${f.iva}): ya no rige, debe ser 15 %`,
      f.sin_precio && 'Sin precio',
      f.repetido && 'Código repetido con otro producto',
      f.rechazado && 'Está en facturas rechazadas por el SRI',
    ].filter(Boolean) as string[],
  }));
}

/** Cantidades para el menú y el inicio (consultas livianas) */
export async function contarRevision(emisorId: number) {
  const partes = TIPOS_REVISION.map((t) => {
    const m = manejador(t);
    return sql`select count(*)::int n from ${sql(m.tabla)} x
      where x.${sql(m.colEmisor)} = ${emisorId} and x.estado in ${sql(ESTADOS_PROBLEMA)} and ${antesDeHoy('x.' + m.colFecha)}`;
  });
  const union = partes.reduce((a, b) => sql`${a} union all ${b}`);
  const [c] = await sql<{ n: number }[]>`select coalesce(sum(n), 0)::int n from (${union}) u`;
  const [p] = await sql<{ n: number }[]>`
    select count(*)::int n from producto p where p.id_emisor = ${emisorId}
      and (p.codigo_iva in ${sql(IVA_ANTIGUOS)} or coalesce(p.precio, 0) = 0
        or exists (select 1 from producto q where q.id_emisor = p.id_emisor and q.codigo = p.codigo and q.id <> p.id))`;
  return { comprobantes: c.n, productos: p.n };
}
