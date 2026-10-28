import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';

const POR_PAGINA = 50;

export default async function Transportistas({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`where t.id_emisor = ${s.emisorId}
    ${q ? sql`and (t.nombre ilike ${'%' + q + '%'} or t.numero_identificacion like ${q + '%'} or t.placa ilike ${q + '%'})` : sql``}`;
  const [{ total }] = await sql<{ total: number }[]>`select count(*) total from transportistas t ${filtro}`;
  const filas = await sql<{ id: number; nombre: string; numero_identificacion: string; placa: string; correo: string | null; tipo: string }[]>`
    select t.id, t.nombre, t.numero_identificacion, t.placa, t.correo, ti.descripcion tipo
    from transportistas t join tipo_identificacion ti on ti.id = t.tipo_identificacion
    ${filtro} order by t.nombre limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Transportistas" sub="Para las guías de remisión">
        <Link href="/transportistas/nuevo" className="btn primario">+ Nuevo transportista</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Nombre, identificación o placa" /></div>
        <button className="btn">Buscar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay transportistas.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>Identificación</th><th>Placa</th><th>Correo</th></tr></thead>
              <tbody>
                {filas.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/transportistas/${t.id}`}>{t.nombre}</Link></td>
                    <td className="nowrap">{t.numero_identificacion} <span className="muted">({t.tipo})</span></td>
                    <td>{t.placa}</td>
                    <td>{t.correo?.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
