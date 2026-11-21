import 'server-only';
import { sql } from './db';
import { contarRevision } from './revision';

/**
 * Datos del tablero de Inicio. Son 5 consultas pequeñas que corren en paralelo.
 * Las ventas excluyen las facturas de PRUEBAS (carácter 24 de la clave = '1').
 */
export type Tablero = Awaited<ReturnType<typeof datosTablero>>;

export async function datosTablero(e: number) {
  const ventasQ = sql<{
    hoy_total: number; hoy_n: number; mes_total: number; mes_n: number; ant_total: number;
    d30_total: number; d30_n: number; no_aut: number; borradores: number; en_proceso: number;
    serie: { d: string; t: number }[];
  }[]>`
    with hoy as (select (now() at time zone 'America/Guayaquil')::date d),
    f as (
      select x.fecha_emision::date d, coalesce(x.total, 0)::float total, x.estado,
        (x.estado = 6 and substr(coalesce(x.clave_de_acceso, ''), 24, 1) <> '1') venta
      from factura x, hoy
      where x.id_emisor = ${e}
        and x.fecha_emision >= least(date_trunc('month', hoy.d) - interval '1 month', hoy.d - 30)
    )
    select
      coalesce(sum(f.total) filter (where f.venta and f.d = hoy.d), 0)::float hoy_total,
      count(f.d) filter (where f.venta and f.d = hoy.d)::int hoy_n,
      coalesce(sum(f.total) filter (where f.venta and f.d >= date_trunc('month', hoy.d)), 0)::float mes_total,
      count(f.d) filter (where f.venta and f.d >= date_trunc('month', hoy.d))::int mes_n,
      coalesce(sum(f.total) filter (where f.venta and f.d >= date_trunc('month', hoy.d) - interval '1 month'
        and f.d <= hoy.d - interval '1 month'), 0)::float ant_total,
      coalesce(sum(f.total) filter (where f.venta and f.d > hoy.d - 30), 0)::float d30_total,
      count(f.d) filter (where f.venta and f.d > hoy.d - 30)::int d30_n,
      count(f.d) filter (where f.estado in (5, 7) and f.d = hoy.d)::int no_aut,
      count(f.d) filter (where f.estado in (1, 2) and f.d = hoy.d)::int borradores,
      count(f.d) filter (where f.estado in (3, 4) and f.d = hoy.d)::int en_proceso,
      (select json_agg(json_build_object('d', g::date, 't',
          coalesce((select sum(f2.total) from f f2 where f2.venta and f2.d = g::date), 0)) order by g)
        from generate_series(hoy.d - 13, hoy.d, interval '1 day') g) serie
    from hoy left join f on true
    group by hoy.d`;

  const otrosQ = sql<{
    autorizadas: number; por_cobrar: number; pedidos_saldo: number; compras_total: number; compras_n: number;
    clientes: number; articulos: number; servicios: number; agotados: number; firma_hasta: Date | null; firma_dias: number | null;
  }[]>`
    with hoy as (select (now() at time zone 'America/Guayaquil')::date d),
    ped as (
      select greatest(coalesce(p.total, 0) - coalesce((select sum(valor) from abonos_pedido a where a.id_pedido = p.id), 0), 0)::float saldo
      from pedido p where p.id_emisor = ${e} and p.estado = 1
    )
    select
      (select count(*) from factura where id_emisor = ${e} and estado = 6)::int autorizadas,
      (select coalesce(sum(saldo), 0) from ped)::float por_cobrar,
      (select count(*) from ped where saldo > 0.005)::int pedidos_saldo,
      (select coalesce(sum(total), 0) from compra, hoy where id_emisor = ${e} and estado <> 8 and fecha >= date_trunc('month', hoy.d))::float compras_total,
      (select count(*) from compra, hoy where id_emisor = ${e} and estado <> 8 and fecha >= date_trunc('month', hoy.d))::int compras_n,
      (select count(*) from clientes where id_emisor = ${e})::int clientes,
      (select count(*) from producto where id_emisor = ${e} and tipo_producto = 1)::int articulos,
      (select count(*) from producto where id_emisor = ${e} and tipo_producto = 2)::int servicios,
      (select count(*) from producto p where p.id_emisor = ${e} and p.tipo_producto = 1
         and (select sum(stock) from productos_x_bodega x where x.id_producto = p.id) <= 0)::int agotados,
      (select valido_hasta from firma_emisor where id_emisor = ${e}) firma_hasta,
      (select (valido_hasta::date - hoy.d) from firma_emisor, hoy where id_emisor = ${e})::int firma_dias`;

  const topsQ = sql<{ tipo: 'p' | 'c'; nombre: string; valor: number }[]>`
    with hoy as (select (now() at time zone 'America/Guayaquil')::date d),
    f as (
      select x.id, x.id_cliente, coalesce(x.total, 0)::float total from factura x, hoy
      where x.id_emisor = ${e} and x.estado = 6 and substr(coalesce(x.clave_de_acceso, ''), 24, 1) <> '1'
        and x.fecha_emision >= date_trunc('month', hoy.d)
    )
    (select 'p' tipo, p.nombre, sum(d.cantidad)::float valor
      from f join detalle_factura d on d.id_factura = f.id join producto p on p.id = d.id_producto
      group by p.id, p.nombre order by 3 desc limit 3)
    union all
    (select 'c' tipo, c.nombre_cliente, sum(f.total)::float valor
      from f join clientes c on c.id = f.id_cliente
      where c.identificacion <> '9999999999999'
      group by c.id, c.nombre_cliente order by 3 desc limit 3)`;

  // Tabla nueva: si aún no existe, la tarjeta no se muestra.
  const correosQ = sql<{ n: number }[]>`
    select count(*)::int n from (
      select distinct e1.id_tipo_comprobante, e1.id_comprobante from envio_correo e1
      where e1.id_emisor = ${e} and not e1.ok and e1.id_tipo_comprobante is not null
        and e1.fecha >= (now() at time zone 'America/Guayaquil') - interval '7 days'
        and not exists (select 1 from envio_correo e2 where e2.id_emisor = e1.id_emisor
          and e2.id_tipo_comprobante = e1.id_tipo_comprobante and e2.id_comprobante = e1.id_comprobante
          and e2.ok and e2.fecha > e1.fecha)
    ) t`.then((r) => r[0].n).catch(() => null as number | null);

  const [[v], [o], tops, correos, rev] = await Promise.all([ventasQ, otrosQ, topsQ, correosQ, contarRevision(e)]);
  return {
    ventas: v,
    otros: o,
    vendidos: tops.filter((t) => t.tipo === 'p'),
    mejoresClientes: tops.filter((t) => t.tipo === 'c'),
    correosFallidos: correos,
    revision: rev,
  };
}

/** Lista de comprobantes cuyo correo falló en los últimos 7 días (y no se reenvió bien después) */
export async function correosFallidos(e: number) {
  try {
    return await sql<{ tipo: number; id: number; destino: string | null; error: string | null; fecha: Date }[]>`
      select distinct on (e1.id_tipo_comprobante, e1.id_comprobante)
        e1.id_tipo_comprobante tipo, e1.id_comprobante id, e1.destino, e1.error, e1.fecha
      from envio_correo e1
      where e1.id_emisor = ${e} and not e1.ok and e1.id_tipo_comprobante is not null
        and e1.fecha >= (now() at time zone 'America/Guayaquil') - interval '7 days'
        and not exists (select 1 from envio_correo e2 where e2.id_emisor = e1.id_emisor
          and e2.id_tipo_comprobante = e1.id_tipo_comprobante and e2.id_comprobante = e1.id_comprobante
          and e2.ok and e2.fecha > e1.fecha)
      order by e1.id_tipo_comprobante, e1.id_comprobante, e1.fecha desc`;
  } catch {
    return [];
  }
}
