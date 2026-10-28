import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Estado, Paginacion, Vacio } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { NOMBRE_ESTADO } from '@/lib/constantes';

const POR_PAGINA = 50;

export default async function Guias({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where g.id_emisor = ${s.emisorId}
    ${q ? sql`and (g.numero_comprobante like ${'%' + q + '%'} or t.nombre ilike ${'%' + q + '%'} or g.placa ilike ${'%' + q + '%'} or g.clave_acceso = ${q}
      or exists (select 1 from guia_remision_destinatario d join clientes c on c.id = d.id_cliente
                 where d.id_guia = g.id and (c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'} or d.numero_factura like ${'%' + q + '%'})))` : sql``}
    ${p.estado ? sql`and g.estado = ${Number(p.estado)}` : sql``}
    ${p.desde ? sql`and g.fecha_inicio_transporte >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and g.fecha_inicio_transporte < ${p.hasta}::date + 1` : sql``}`;
  const [tot] = await sql<{ n: number }[]>`
    select count(*) n from guia_remision g join transportistas t on t.id = g.id_transportista ${filtro}`;
  const filas = await sql<{ id: number; numero: string; inicio: Date; transportista: string; placa: string; destinatarios: string | null; estado: number }[]>`
    select g.id, g.numero_comprobante numero, g.fecha_inicio_transporte inicio, t.nombre transportista, g.placa, g.estado,
           (select string_agg(c.nombre_cliente, ', ') from guia_remision_destinatario d join clientes c on c.id = d.id_cliente where d.id_guia = g.id) destinatarios
    from guia_remision g join transportistas t on t.id = g.id_transportista
    ${filtro}
    order by g.fecha_inicio_transporte desc, g.id desc
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Guías de remisión">
        <Link href="/guias-remision/nueva" className="btn primario">+ Nueva guía</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Número, transportista, placa, destinatario o factura" /></div>
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
        {filas.length === 0 ? <Vacio>No hay guías de remisión con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Número</th><th>Inicio transporte</th><th>Transportista</th><th>Placa</th><th>Destinatarios</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((g) => (
                  <tr key={g.id}>
                    <td className="nowrap"><Link href={g.estado <= 2 ? `/guias-remision/${g.id}/editar` : `/guias-remision/${g.id}`}>{g.numero || `Borrador #${g.id}`}</Link></td>
                    <td className="nowrap">{fecha(g.inicio)}</td>
                    <td>{g.transportista}</td>
                    <td className="nowrap">{g.placa}</td>
                    <td>{g.destinatarios ?? <span className="muted">Sin destinatarios</span>}</td>
                    <td><Estado id={g.estado} /></td>
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
