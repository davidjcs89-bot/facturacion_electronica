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
      <Cabecera titulo="Contactos" sub="Clientes, proveedores, sujetos de retención y destinatarios">
        <Link href="/clientes/nuevo" className="btn primario">+ Nuevo</Link>
      </Cabecera>
      <form className="filtros plegable fija">
        <div className="campo busqueda"><label>Buscar</label><input name="q" type="search" defaultValue={q} placeholder="Nombre, identificación, código o celular" /></div>
        <input type="checkbox" id="ver-filtros" className="ver-filtros" defaultChecked={!!p.tipo} />
        <label htmlFor="ver-filtros" className="btn boton-filtros">Filtros{p.tipo ? ' •' : ''}</label>
        <div className="campo"><label>Tipo</label>
          <select name="tipo" defaultValue={p.tipo ?? ''}>
            <option value="">Todos</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
          </select>
        </div>
        <button className="btn primario">Aplicar filtro</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay contactos con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla tarjetas">
              <thead><tr><th>Nombre / razón social</th><th>Identificación</th><th>Tipo</th><th>Correo</th><th>Celular</th><th>Código</th></tr></thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.id}>
                    <td data-r="titulo"><Link className="abrir" href={`/clientes/${c.id}`}>{c.nombre_cliente}</Link></td>
                    <td className="nowrap" data-r="sub">{c.identificacion}</td>
                    <td data-r="ocultar">{c.tipo}</td>
                    <td data-r="extra">{c.correo?.toLowerCase()}</td>
                    <td className="nowrap" data-r="sub2">{c.telefono_movil}</td>
                    <td data-r="ocultar">{c.codigo}</td>
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
