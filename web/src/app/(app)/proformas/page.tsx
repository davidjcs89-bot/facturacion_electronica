import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { money, fecha } from '@/lib/formato';

const POR_PAGINA = 50;

export default async function Proformas({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where x.id_emisor = ${s.emisorId}
    ${q ? sql`and (x.numero::text = ${q} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'})` : sql``}
    ${p.desde ? sql`and x.fecha_emision >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and x.fecha_emision < ${p.hasta}::date + 1` : sql``}`;
  const [{ n }] = await sql<{ n: number }[]>`select count(*) n from proforma x join clientes c on c.id = x.id_cliente ${filtro}`;
  const filas = await sql<{ id: number; numero: number; fecha_emision: Date; cliente: string; total: number }[]>`
    select x.id, x.numero, x.fecha_emision, c.nombre_cliente cliente, x.total
    from proforma x join clientes c on c.id = x.id_cliente ${filtro}
    order by x.numero desc limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Proformas" sub="Cotizaciones sin valor tributario">
        <Link href="/proformas/nueva" className="btn primario">+ Nueva proforma</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, cliente o identificación" /></div>
        <div className="campo"><label>Desde</label><input type="date" name="desde" defaultValue={p.desde ?? ''} /></div>
        <div className="campo"><label>Hasta</label><input type="date" name="hasta" defaultValue={p.hasta ?? ''} /></div>
        <button className="btn">Filtrar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay proformas.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th className="num">Total</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td><Link href={`/proformas/${f.id}`}>{f.numero}</Link></td>
                    <td className="nowrap">{fecha(f.fecha_emision)}</td>
                    <td>{f.cliente}</td>
                    <td className="num">{money(f.total)}</td>
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
