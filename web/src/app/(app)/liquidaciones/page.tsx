import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Estado, Paginacion, Vacio } from '@/components/ui';
import { money, fecha } from '@/lib/formato';
import { NOMBRE_ESTADO } from '@/lib/constantes';

const POR_PAGINA = 50;

export default async function Liquidaciones({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where f.id_emisor = ${s.emisorId}
    ${q ? sql`and (f.numero like ${'%' + q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'} or f.clave_de_acceso = ${q})` : sql``}
    ${p.estado ? sql`and f.estado = ${Number(p.estado)}` : sql``}
    ${p.desde ? sql`and f.fecha_emision >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and f.fecha_emision < ${p.hasta}::date + 1` : sql``}`;
  const [tot] = await sql<{ n: number; total: number }[]>`
    select count(*) n, coalesce(sum(f.total) filter (where f.estado = 6), 0) total
    from liquidacion_compra f join clientes c on c.id = f.id_cliente ${filtro}`;
  const filas = await sql<{ id: number; numero: string; fecha_emision: Date; cliente: string; identificacion: string; total: number; estado: number }[]>`
    select f.id, f.numero, f.fecha_emision, c.nombre_cliente cliente, c.identificacion, f.total, f.estado
    from liquidacion_compra f join clientes c on c.id = f.id_cliente
    ${filtro}
    order by f.fecha_emision desc, f.id desc
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Liquidaciones de compra" sub={`Total autorizado en la selección: $${money(tot.total)}`}>
        <Link href="/liquidaciones/nueva" className="btn primario">+ Nueva liquidación</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, proveedor, identificación o clave de acceso" /></div>
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
        {filas.length === 0 ? <Vacio>No hay liquidaciones con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Identificación</th><th className="num">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="nowrap"><Link href={f.estado <= 2 ? `/liquidaciones/${f.id}/editar` : `/liquidaciones/${f.id}`}>{f.numero || `Borrador #${f.id}`}</Link></td>
                    <td className="nowrap">{fecha(f.fecha_emision)}</td>
                    <td>{f.cliente}</td>
                    <td className="nowrap">{f.identificacion}</td>
                    <td className="num">{money(f.total)}</td>
                    <td><Estado id={f.estado} /></td>
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
