import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { money, fecha } from '@/lib/formato';

const POR_PAGINA = 50;

export default async function Compras({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where x.id_emisor = ${s.emisorId}
    ${q ? sql`and (x.numero like ${'%' + q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'})` : sql``}
    ${p.desde ? sql`and x.fecha >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and x.fecha < ${p.hasta}::date + 1` : sql``}`;
  const [t] = await sql<{ n: number; total: number }[]>`select count(*) n, coalesce(sum(x.total) filter (where x.estado <> 8), 0) total from compra x join clientes c on c.id = x.id_cliente ${filtro}`;
  const filas = await sql<{ id: number; fecha: Date; numero: string; proveedor: string; total: number; estado: number; bodega: string }[]>`
    select x.id, x.fecha, x.numero, c.nombre_cliente proveedor, x.total, x.estado, b.nombre bodega
    from compra x join clientes c on c.id = x.id_cliente left join bodegas b on b.id = x.id_bodega ${filtro}
    order by x.fecha desc, x.id desc limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Compras" sub={`Total en la selección: $${money(t.total)}`}>
        <Link className="btn primario" href="/compras/importar">Importar XML</Link>
        <Link className="btn" href="/compras/nueva">+ Compra manual</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, proveedor o RUC" /></div>
        <div className="campo"><label>Desde</label><input type="date" name="desde" defaultValue={p.desde ?? ''} /></div>
        <div className="campo"><label>Hasta</label><input type="date" name="hasta" defaultValue={p.hasta ?? ''} /></div>
        <button className="btn">Filtrar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay compras.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Fecha</th><th>Número</th><th>Proveedor</th><th>Bodega</th><th className="num">Total</th><th></th></tr></thead>
              <tbody>{filas.map((c) => (
                <tr key={c.id}>
                  <td className="nowrap">{fecha(c.fecha)}</td><td className="nowrap"><Link href={`/compras/${c.id}`}>{c.numero}</Link></td>
                  <td>{c.proveedor}</td><td>{c.bodega}</td><td className="num">{money(c.total)}</td>
                  <td>{c.estado === 8 && <span className="badge e8">Anulada</span>}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={t.n} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
