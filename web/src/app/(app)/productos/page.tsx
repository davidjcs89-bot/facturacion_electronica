import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { money } from '@/lib/formato';

const POR_PAGINA = 50;

export default async function Productos({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const filtro = sql`
    where p.id_emisor = ${s.emisorId}
    ${q ? sql`and (p.codigo ilike ${q + '%'} or p.codigo_auxiliar ilike ${q + '%'} or p.nombre ilike ${'%' + q + '%'})` : sql``}
    ${p.tipo ? sql`and p.tipo_producto = ${Number(p.tipo)}` : sql``}`;
  const [{ total }] = await sql<{ total: number }[]>`select count(*) total from producto p ${filtro}`;
  const filas = await sql<{ id: number; codigo: string; codigo_auxiliar: string | null; nombre: string; precio: number; iva: string; iva_pct: number; tipo: string; stock: number | null }[]>`
    select p.id, p.codigo, p.codigo_auxiliar, p.nombre, p.precio, iva.descripcion iva, iva.porcentaje iva_pct, t.descripcion tipo,
           (select sum(stock) from productos_x_bodega x where x.id_producto = p.id) stock
    from producto p
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join tipo_producto t on t.id = p.tipo_producto
    ${filtro}
    order by p.nombre
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Productos" sub="Bienes y servicios que se facturan">
        <Link href="/productos/nuevo" className="btn primario">+ Nuevo producto</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Código, código auxiliar o nombre" /></div>
        <div className="campo"><label>Tipo</label>
          <select name="tipo" defaultValue={p.tipo ?? ''}><option value="">Todos</option><option value="1">Bien</option><option value="2">Servicio</option></select>
        </div>
        <button className="btn">Buscar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay productos con ese criterio.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>IVA</th><th className="num">Precio sin IVA</th><th className="num">P.V.P.</th><th className="num">Stock</th></tr></thead>
              <tbody>
                {filas.map((x) => (
                  <tr key={x.id}>
                    <td className="nowrap"><Link href={`/productos/${x.id}`}>{x.codigo}</Link>{x.codigo_auxiliar && <div className="muted">{x.codigo_auxiliar}</div>}</td>
                    <td><Link href={`/productos/${x.id}`}>{x.nombre}</Link></td>
                    <td>{x.tipo}</td>
                    <td className="nowrap">{x.iva}</td>
                    <td className="num">{money(x.precio)}</td>
                    <td className="num">{money(Number(x.precio) * (1 + Number(x.iva_pct) / 100))}</td>
                    <td className="num">{x.stock ?? ''}</td>
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
