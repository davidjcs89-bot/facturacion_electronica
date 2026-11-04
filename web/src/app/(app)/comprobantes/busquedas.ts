'use server';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { ID_CONSUMIDOR_FINAL } from '@/lib/constantes';

export type ProductoBusqueda = {
  id: number; codigo: string; nombre: string; precio: number; iva_pct: number; pvp: number; stock: number | null; tipo_producto: number;
};

export async function buscarProductos(q: string): Promise<ProductoBusqueda[]> {
  const s = await requerirEmisor();
  const texto = q.trim();
  if (texto.length < 1) return [];
  return sql<ProductoBusqueda[]>`
    select p.id, p.codigo, p.nombre, p.precio, iva.porcentaje iva_pct,
           round(p.precio * (1 + iva.porcentaje / 100), 2) pvp,
           (select sum(stock) from productos_x_bodega x where x.id_producto = p.id) stock, p.tipo_producto
    from producto p join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    where p.id_emisor = ${s.emisorId}
      and (p.codigo ilike ${texto + '%'} or p.nombre ilike ${'%' + texto + '%'} or p.codigo_auxiliar ilike ${texto + '%'})
    order by (p.codigo ilike ${texto}) desc, p.nombre
    limit 20`;
}

export type ClienteBusqueda = {
  id: number; nombre_cliente: string; identificacion: string; correo: string | null; tipo_cliente: number; direccion: string | null;
  telefono: string | null; tipo_identificacion: string | null;
};

const columnasCliente = () => sql`
  c.id, c.nombre_cliente, c.identificacion, c.correo, c.tipo_cliente, c.direccion,
  nullif(concat_ws(' / ', nullif(trim(c.telefono_movil), ''), nullif(trim(c.telefono_fijo), '')), '') telefono,
  t.descripcion tipo_identificacion`;

/** Busca clientes del emisor; tipo opcional (1 cliente, 2 sujeto retencion, 3 destinatario, 4 proveedor) */
export async function buscarClientes(q: string, tipo?: number): Promise<ClienteBusqueda[]> {
  const s = await requerirEmisor();
  const texto = q.trim();
  if (texto.length < 2) return [];
  return sql<ClienteBusqueda[]>`
    select ${columnasCliente()}
    from clientes c left join tipo_identificacion t on t.id = c.tipo_identificacion
    where c.id_emisor = ${s.emisorId} and c.id <> ${ID_CONSUMIDOR_FINAL}
      ${tipo ? sql`and c.tipo_cliente = ${tipo}` : sql``}
      and (c.identificacion like ${texto + '%'} or c.nombre_cliente ilike ${'%' + texto + '%'} or c.codigo = ${texto})
    order by c.nombre_cliente
    limit 15`;
}

/** Datos completos de un cliente del emisor (para mostrarlos al elegirlo) */
export async function datosCliente(id: number): Promise<ClienteBusqueda | null> {
  const s = await requerirEmisor();
  if (!id || id === ID_CONSUMIDOR_FINAL) return null;
  const [c] = await sql<ClienteBusqueda[]>`
    select ${columnasCliente()}
    from clientes c left join tipo_identificacion t on t.id = c.tipo_identificacion
    where c.id = ${id} and c.id_emisor = ${s.emisorId}`;
  return c ?? null;
}

export type ClienteEdicion = {
  id: number; nombre_cliente: string; tipo_identificacion: number; tipo_cliente: number; identificacion: string;
  telefono_fijo: string | null; telefono_movil: string | null; direccion: string | null; correo: string | null; codigo: string | null;
};
export type OpcionCatalogo = { id: number; descripcion: string };

/** Datos para la ventana de crear/editar cliente: catalogos y, si se indica id, el cliente */
export async function formularioCliente(id?: number): Promise<{ tiposId: OpcionCatalogo[]; tiposCli: OpcionCatalogo[]; cliente: ClienteEdicion | null }> {
  const s = await requerirEmisor();
  const [tiposId, tiposCli, cli] = await Promise.all([
    sql<OpcionCatalogo[]>`select id, descripcion from tipo_identificacion order by id`,
    sql<OpcionCatalogo[]>`select id, descripcion from tipo_cliente order by id`,
    id && id !== ID_CONSUMIDOR_FINAL
      ? sql<ClienteEdicion[]>`
          select id, nombre_cliente, tipo_identificacion, tipo_cliente, identificacion, telefono_fijo, telefono_movil, direccion, correo, codigo
          from clientes where id = ${id} and id_emisor = ${s.emisorId}`
      : Promise.resolve([] as ClienteEdicion[]),
  ]);
  return { tiposId, tiposCli, cliente: cli[0] ?? null };
}
