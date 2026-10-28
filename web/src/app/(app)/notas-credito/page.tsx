import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Estado, Paginacion, Vacio } from '@/components/ui';
import { money, fecha } from '@/lib/formato';
import { NOMBRE_ESTADO } from '@/lib/constantes';

const POR_PAGINA = 50;

export default async function NotasCredito({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where n.id_emisor = ${s.emisorId}
    ${q ? sql`and (n.numero like ${'%' + q + '%'} or n.numero_fc_mod like ${'%' + q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'} or n.clave_acceso = ${q})` : sql``}
    ${p.estado ? sql`and n.estado = ${Number(p.estado)}` : sql``}
    ${p.desde ? sql`and n.fecha_emision >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and n.fecha_emision < ${p.hasta}::date + 1` : sql``}`;
  const [tot] = await sql<{ n: number; total: number }[]>`
    select count(*) n, coalesce(sum(n.total) filter (where n.estado = 6), 0) total
    from nota_credito n join clientes c on c.id = n.id_cliente ${filtro}`;
  const filas = await sql<{ id: number; numero: string; fecha_emision: Date; cliente: string; numero_fc_mod: string; motivo: string; total: number; estado: number }[]>`
    select n.id, n.numero, n.fecha_emision, c.nombre_cliente cliente, n.numero_fc_mod, n.motivo, n.total, n.estado
    from nota_credito n join clientes c on c.id = n.id_cliente
    ${filtro}
    order by n.fecha_emision desc, n.id desc
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Notas de crédito" sub={`Total autorizado en la selección: $${money(tot.total)}`}>
        <Link href="/notas-credito/nueva" className="btn primario">+ Nueva nota de crédito</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, factura, cliente, identificación o clave de acceso" /></div>
        <div className="campo"><label>Estado</label>
          <select name="estado" defaultValue={p.estado ?? ''}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="campo"><label>Desde</label><input type="date" name="desde" defaultValue={p.desde ?? ''} /></div>
        <div className="campo"><label>Hasta</label><input type="date" name="hasta" defaultValue={p.hasta ?? ''} /></div>
        <button className="btn">Filtrar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay notas de crédito con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Motivo</th><th className="num">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((n) => (
                  <tr key={n.id}>
                    <td className="nowrap"><Link href={n.estado <= 2 ? `/notas-credito/${n.id}/editar` : `/notas-credito/${n.id}`}>{n.numero || `Borrador #${n.id}`}</Link></td>
                    <td className="nowrap">{fecha(n.fecha_emision)}</td>
                    <td>{n.cliente}</td>
                    <td className="nowrap">{n.numero_fc_mod}</td>
                    <td>{n.motivo}</td>
                    <td className="num">{money(n.total)}</td>
                    <td><Estado id={n.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={tot.n} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
