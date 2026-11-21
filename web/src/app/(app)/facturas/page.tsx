import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Estado, Paginacion, Vacio } from '@/components/ui';
import { vozHabilitada } from '@/lib/voz/habilitada';
import { money, fecha } from '@/lib/formato';
import { NOMBRE_ESTADO } from '@/lib/constantes';
import { contarRevision } from '@/lib/revision';

const POR_PAGINA = 50;

export default async function Facturas({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const rev = await contarRevision(s.emisorId);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where f.id_emisor = ${s.emisorId}
    and not (f.estado in (1, 2, 3, 4, 5, 7) and f.fecha_emision::date < (now() at time zone 'America/Guayaquil')::date)
    ${q ? sql`and (f.numero like ${'%' + q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'} or f.clave_de_acceso = ${q})` : sql``}
    ${p.estado ? sql`and f.estado = ${Number(p.estado)}` : sql``}
    ${p.desde ? sql`and f.fecha_emision >= ${p.desde}::date` : sql``}
    ${p.hasta ? sql`and f.fecha_emision < ${p.hasta}::date + 1` : sql``}`;
  const [tot] = await sql<{ n: number; total: number }[]>`
    select count(*) n, coalesce(sum(f.total) filter (where f.estado = 6), 0) total
    from factura f join clientes c on c.id = f.id_cliente ${filtro}`;
  // Autorizado del mes en curso y de los últimos 30 días (hora de Ecuador)
  const [per] = await sql<{ mes: number; dias30: number }[]>`
    select
      coalesce(sum(total) filter (where fecha_emision >= date_trunc('month', now() at time zone 'America/Guayaquil')), 0)::float mes,
      coalesce(sum(total) filter (where fecha_emision >= (now() at time zone 'America/Guayaquil')::date - 29), 0)::float dias30
    from factura
    where id_emisor = ${s.emisorId} and estado = 6
      and substr(coalesce(clave_de_acceso, ''), 24, 1) <> '1' -- las de PRUEBAS no son ventas reales
      and fecha_emision >= least(date_trunc('month', now() at time zone 'America/Guayaquil'), (now() at time zone 'America/Guayaquil')::date - 29)`;
  const conFiltro = !!(q || p.estado || p.desde || p.hasta);
  const filas = await sql<{ id: number; numero: string; fecha_emision: Date; cliente: string; identificacion: string; total: number; estado: number; ambiente: string | null }[]>`
    select f.id, f.numero, f.fecha_emision, c.nombre_cliente cliente, c.identificacion, f.total, f.estado,
      coalesce(case when length(f.clave_de_acceso) = 49 then substr(f.clave_de_acceso, 24, 1) end, pa.ambiente, ta.codigo_ambiente) ambiente
    from factura f join clientes c on c.id = f.id_cliente
    left join punto_emision_app pa on pa.id_punto = f.id_punto_emison
    left join emisor em on em.id = f.id_emisor
    left join tipo_ambientes ta on ta.id = em.tipo_ambiente
    ${filtro}
    order by f.fecha_emision desc, f.id desc
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Facturas" sub={<>Autorizado este mes: <strong>${money(per.mes)}</strong> · Últimos 30 días: <strong>${money(per.dias30)}</strong>{conFiltro && <> · En la selección: ${money(tot.total)}</>}{rev.comprobantes > 0 && <> · <Link href="/revision">{rev.comprobantes} de días anteriores en Revisión</Link></>}</>}>
        {vozHabilitada(s.emisorId) && <Link href="/facturas/voz" className="btn solo-escritorio">Factura por voz</Link>}
        <Link href="/facturas/nueva" className="btn primario solo-escritorio">+ Nueva factura</Link>
      </Cabecera>
      <form className="filtros plegable">
        <div className="campo busqueda"><label>Buscar</label><input name="q" type="search" defaultValue={q} placeholder="Número, cliente, identificación o clave de acceso" /></div>
        {/* Celular: estado y fechas se abren con «Filtros» */}
        <input type="checkbox" id="ver-filtros" className="ver-filtros" defaultChecked={!!(p.estado || p.desde || p.hasta)} />
        <label htmlFor="ver-filtros" className="btn boton-filtros">Filtros{p.estado || p.desde || p.hasta ? ' •' : ''}</label>
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
        {filas.length === 0 ? <Vacio>No hay facturas con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla tarjetas">
              <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Identificación</th><th className="num">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="nowrap" data-r="sub"><Link className="abrir" href={f.estado <= 2 ? `/facturas/${f.id}/editar` : `/facturas/${f.id}`}>{f.numero || `Borrador #${f.id}`}</Link></td>
                    <td className="nowrap" data-r="sub2">{fecha(f.fecha_emision)}</td>
                    <td data-r="titulo">{f.cliente}</td>
                    <td className="nowrap" data-r="ocultar">{f.identificacion}</td>
                    <td className="num" data-r="monto">{money(f.total)}</td>
                    <td data-r="estado">{f.ambiente === '1' && <span className="badge pruebas">PRUEBAS</span>} <Estado id={f.estado} /></td>
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
