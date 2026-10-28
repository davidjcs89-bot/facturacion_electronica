import 'server-only';
import type postgres from 'postgres';

// Acepta la conexion global (sql) o una transaccion (tx de sql.begin)
type Tx = postgres.Sql<Record<string, never>> | postgres.TransactionSql<Record<string, never>>;

/**
 * Suma (o resta, con cantidad negativa) stock de un producto en una bodega; crea el registro si no existe.
 * Si hay registros duplicados (datos migrados) se ajusta el primero.
 */
export async function moverStock(tx: Tx, idProducto: number, idBodega: number, cantidad: number) {
  if (!cantidad) return;
  const r = await tx`
    update productos_x_bodega set stock = stock + ${cantidad}
    where id = (select min(id) from productos_x_bodega where id_producto = ${idProducto} and id_bodega = ${idBodega})
    returning id`;
  if (!r.length) await tx`insert into productos_x_bodega (id_producto, id_bodega, stock) values (${idProducto}, ${idBodega}, ${cantidad})`;
}

/** Stock disponible de un producto en una bodega (0 si no hay registro) */
export async function stockDe(tx: Tx, idProducto: number, idBodega: number) {
  const [r] = await tx<{ stock: number }[]>`select coalesce(sum(stock), 0) stock from productos_x_bodega where id_producto = ${idProducto} and id_bodega = ${idBodega}`;
  return Number(r.stock);
}
