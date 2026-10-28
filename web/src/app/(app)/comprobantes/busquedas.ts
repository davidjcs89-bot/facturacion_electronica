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

export type ClienteBusqueda = { id: number; nombre_cliente: string; identificacion: string; correo: string | null; tipo_cliente: number; direccion: string | null };

/** Busca clientes del emisor; tipo opcional (1 cliente, 2 sujeto retencion, 3 destinatario, 4 proveedor) */
export async function buscarClientes(q: string, tipo?: number): Promise<ClienteBusqueda[]> {
  const s = await requerirEmisor();
  const texto = q.trim();
  if (texto.length < 2) return [];
  return sql<ClienteBusqueda[]>`
    select id, nombre_cliente, identificacion, correo, tipo_cliente, direccion
    from clientes
    where id_emisor = ${s.emisorId} and id <> ${ID_CONSUMIDOR_FINAL}
      ${tipo ? sql`and tipo_cliente = ${tipo}` : sql``}
      and (identificacion like ${texto + '%'} or nombre_cliente ilike ${'%' + texto + '%'} or codigo = ${texto})
    order by nombre_cliente
    limit 15`;
}
