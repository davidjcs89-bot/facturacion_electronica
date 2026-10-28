import Link from 'next/link';
import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { trabajarConEmisor, salirDelEmisor } from './actions';
import { ESTADOS_CUENTA, CLASE_ESTADO } from '../_comun/estados';

const POR_PAGINA = 50;

export default async function Emisores({ searchParams }: { searchParams: SP }) {
  const s = await requerirAdminSistema();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const estado = p.estado ?? 'visibles';
  const filtro = sql`where true
    ${q ? sql`and (e.ruc like ${q + '%'} or e.razon_social ilike ${'%' + q + '%'} or e.nombre_comercial ilike ${'%' + q + '%'})` : sql``}
    ${estado === 'visibles' ? sql`and e.estado <> 3` : estado ? sql`and e.estado = ${Number(estado)}` : sql``}`;
  const [{ total }] = await sql<{ total: number }[]>`select count(*) total from emisor e ${filtro}`;
  const filas = await sql<{ id: number; ruc: string; razon_social: string; nombre_comercial: string; estado: number; ambiente: string;
    fecha_desde: Date | null; fecha_hasta: Date | null; usuarios: number; ultima: Date | null }[]>`
    select e.id, e.ruc, e.razon_social, e.nombre_comercial, e.estado, a.descripcion_ambiente ambiente, h.fecha_desde, h.fecha_hasta,
      (select count(*) from usuario u where u.id_emisor = e.id and u.estado = 1) usuarios,
      (select max(f.fecha_emision) from factura f where f.id_emisor = e.id) ultima
    from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente
    left join emisor_habilitacion h on h.id_emisor = e.id
    ${filtro}
    order by e.id desc limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  const ahora = new Date();
  return (
    <>
      <Cabecera titulo="Emisores" sub="Empresas registradas en el sistema">
        {s.emisorId && <form action={salirDelEmisor}><button className="btn">Salir del emisor actual</button></form>}
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="RUC, razón social o nombre comercial" /></div>
        <div className="campo"><label>Estado</label>
          <select name="estado" defaultValue={estado}>
            <option value="visibles">Todos menos eliminados</option>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_CUENTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn">Buscar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay emisores con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>RUC</th><th>Razón social</th><th>Ambiente</th><th>Estado</th><th>Habilitado hasta</th><th className="num">Usuarios</th><th>Última factura</th><th></th></tr></thead>
              <tbody>
                {filas.map((e) => {
                  const vencido = e.fecha_hasta ? e.fecha_hasta < ahora : false;
                  return (
                    <tr key={e.id}>
                      <td className="nowrap"><Link href={`/admin/emisores/${e.id}`}>{e.ruc}</Link></td>
                      <td>{e.razon_social}{e.nombre_comercial && e.nombre_comercial !== e.razon_social && <div className="muted">{e.nombre_comercial}</div>}</td>
                      <td>{e.ambiente}</td>
                      <td><span className={`badge ${CLASE_ESTADO[e.estado] ?? 'e1'}`}>{ESTADOS_CUENTA[e.estado] ?? e.estado}</span></td>
                      <td className="nowrap" style={{ color: vencido ? 'var(--danger)' : undefined }}>{e.fecha_hasta ? fecha(e.fecha_hasta) : '—'}</td>
                      <td className="num">{e.usuarios}</td>
                      <td className="nowrap">{e.ultima ? fecha(e.ultima) : '—'}</td>
                      <td className="nowrap">
                        {s.emisorId === e.id ? <span className="badge e4">Actual</span> : (
                          <form action={trabajarConEmisor}><input type="hidden" name="id" value={e.id} /><button className="btn chico">Trabajar con este</button></form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
