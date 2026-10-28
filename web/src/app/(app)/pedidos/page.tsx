import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Estado, Paginacion, Vacio } from '@/components/ui';
import { money, fecha } from '@/lib/formato';

const POR_PAGINA = 50;

export default async function Pedidos({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where x.id_emisor = ${s.emisorId}
    ${q ? sql`and (x.numero ilike ${q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.codigo = ${q} or c.identificacion like ${q + '%'})` : sql``}
    ${p.estado ? sql`and x.estado = ${Number(p.estado)}` : sql``}`;
  const [{ n }] = await sql<{ n: number }[]>`select count(*) n from pedido x join clientes c on c.id = x.id_cliente ${filtro}`;
  const filas = await sql<{ id: number; numero: string; fecha_creacion: Date; cliente: string; total: number; abonado: number; estado: number }[]>`
    select x.id, x.numero, x.fecha_creacion, c.nombre_cliente cliente, x.total, x.estado,
      (select coalesce(sum(valor), 0) from abonos_pedido a where a.id_pedido = x.id) abonado
    from pedido x join clientes c on c.id = x.id_cliente ${filtro}
    order by x.id desc limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Pedidos" sub="Pedidos de clientes con abonos">
        <Link href="/pedidos/nuevo" className="btn primario">+ Nuevo pedido</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, cliente, código o identificación" /></div>
        <div className="campo"><label>Estado</label>
          <select name="estado" defaultValue={p.estado ?? ''}><option value="">Todos</option><option value="1">Pendiente</option><option value="3">Finalizado</option><option value="8">Anulado</option></select>
        </div>
        <button className="btn">Filtrar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay pedidos.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th className="num">Total</th><th className="num">Abonado</th><th className="num">Saldo</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="nowrap"><Link href={`/pedidos/${f.id}`}>{f.numero}</Link></td>
                    <td className="nowrap">{fecha(f.fecha_creacion)}</td>
                    <td>{f.cliente}</td>
                    <td className="num">{money(f.total)}</td>
                    <td className="num">{money(f.abonado)}</td>
                    <td className="num">{money(Number(f.total) - Number(f.abonado))}</td>
                    <td><Estado id={f.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={n} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
