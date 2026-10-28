import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { tiposCliente } from '@/lib/catalogos';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { ID_CONSUMIDOR_FINAL } from '@/lib/constantes';

const POR_PAGINA = 50;

export default async function Clientes({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const tipo = p.tipo ? Number(p.tipo) : null;
  const filtro = sql`
    where c.id_emisor = ${s.emisorId} and c.id <> ${ID_CONSUMIDOR_FINAL}
    ${q ? sql`and (c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'} or c.codigo = ${q} or c.telefono_movil like ${q + '%'})` : sql``}
    ${tipo ? sql`and c.tipo_cliente = ${tipo}` : sql``}`;
  const [{ total }] = await sql<{ total: number }[]>`select count(*) total from clientes c ${filtro}`;
  const filas = await sql<{ id: number; nombre_cliente: string; identificacion: string; correo: string | null; telefono_movil: string | null; tipo: string; codigo: string | null }[]>`
    select c.id, c.nombre_cliente, c.identificacion, c.correo, c.telefono_movil, c.codigo, t.descripcion tipo
    from clientes c join tipo_cliente t on t.id = c.tipo_cliente
    ${filtro}
    order by c.nombre_cliente
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  const tipos = await tiposCliente();
  return (
    <>
      <Cabecera titulo="Clientes" sub="Clientes, proveedores, sujetos de retención y destinatarios">
        <Link href="/clientes/nuevo" className="btn primario">+ Nuevo cliente</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Nombre, identificación, código o celular" /></div>
        <div className="campo"><label>Tipo</label>
          <select name="tipo" defaultValue={p.tipo ?? ''}>
            <option value="">Todos</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
          </select>
        </div>
        <button className="btn">Buscar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay clientes con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Nombre / razón social</th><th>Identificación</th><th>Tipo</th><th>Correo</th><th>Celular</th><th>Código</th></tr></thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/clientes/${c.id}`}>{c.nombre_cliente}</Link></td>
                    <td className="nowrap">{c.identificacion}</td>
                    <td>{c.tipo}</td>
                    <td>{c.correo?.toLowerCase()}</td>
                    <td className="nowrap">{c.telefono_movil}</td>
                    <td>{c.codigo}</td>
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
