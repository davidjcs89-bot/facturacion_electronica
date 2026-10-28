import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Estado, Paginacion, Vacio } from '@/components/ui';
import { money, fecha } from '@/lib/formato';
import { NOMBRE_ESTADO } from '@/lib/constantes';

const POR_PAGINA = 50;

export default async function Retenciones({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where r.id_emisor = ${s.emisorId}
    ${q ? sql`and (r.numero like ${'%' + q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'} or r.clave_acceso = ${q})` : sql``}
    ${p.estado ? sql`and r.estado = ${Number(p.estado)}` : sql``}
    ${p.desde ? sql`and r.fecha_emision >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and r.fecha_emision < ${p.hasta}::date + 1` : sql``}`;
  const [tot] = await sql<{ n: number }[]>`
    select count(*) n from retencion r left join clientes c on c.id = r.id_cliente ${filtro}`;
  const filas = await sql<{ id: number; numero: string; fecha_emision: Date; sujeto: string | null; identificacion: string | null; total: number; estado: number }[]>`
    select r.id, r.numero, r.fecha_emision, c.nombre_cliente sujeto, c.identificacion, r.estado,
           (select coalesce(sum(valor_retenido), 0) from detalle_retencion d where d.id_retencion = r.id) total
    from retencion r left join clientes c on c.id = r.id_cliente
    ${filtro}
    order by r.fecha_emision desc, r.id desc
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Comprobantes de retención">
        <Link href="/retenciones/nueva" className="btn primario">+ Nueva retención</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, sujeto retenido, identificación o clave de acceso" /></div>
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
        {filas.length === 0 ? <Vacio>No hay retenciones con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Número</th><th>Fecha</th><th>Sujeto retenido</th><th>Identificación</th><th className="num">Total retenido</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap"><Link href={r.estado <= 2 ? `/retenciones/${r.id}/editar` : `/retenciones/${r.id}`}>{r.numero || `Borrador #${r.id}`}</Link></td>
                    <td className="nowrap">{fecha(r.fecha_emision)}</td>
                    <td>{r.sujeto ?? <span className="muted">Sin sujeto</span>}</td>
                    <td className="nowrap">{r.identificacion}</td>
                    <td className="num">{money(r.total)}</td>
                    <td><Estado id={r.estado} /></td>
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
