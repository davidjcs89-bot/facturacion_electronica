import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { bodegas as listaBodegas } from '@/lib/catalogos';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';

const POR_PAGINA = 100;

export default async function Existencias({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const bodega = p.bodega ? Number(p.bodega) : null;
  const filtro = sql`
    where b.id_emisor = ${s.emisorId}
    ${bodega ? sql`and b.id = ${bodega}` : sql``}
    ${q ? sql`and (pr.codigo ilike ${q + '%'} or pr.nombre ilike ${'%' + q + '%'})` : sql``}
    ${p.solo === 'negativo' ? sql`and x.stock < 0` : p.solo === 'con' ? sql`and x.stock > 0` : sql``}`;
  const [{ n, unidades }] = await sql<{ n: number; unidades: number }[]>`
    select count(*) n, coalesce(sum(x.stock), 0) unidades
    from productos_x_bodega x join bodegas b on b.id = x.id_bodega join producto pr on pr.id = x.id_producto ${filtro}`;
  const filas = await sql<{ id: number; codigo: string; nombre: string; bodega: string; stock: number; id_producto: number }[]>`
    select x.id, pr.codigo, pr.nombre, b.nombre bodega, x.stock, pr.id id_producto
    from productos_x_bodega x join bodegas b on b.id = x.id_bodega join producto pr on pr.id = x.id_producto
    ${filtro} order by pr.nombre, b.nombre limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  const bods = await listaBodegas(s.emisorId);
  return (
    <>
      <Cabecera titulo="Consulta de existencias" sub={`${Number(unidades).toLocaleString('es-EC')} unidades en la selección`}>
        <Link className="btn" href="/ingresos-bodega/nuevo">+ Ingreso de existencias</Link>
      </Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Producto</label><input name="q" defaultValue={q} placeholder="Código o nombre" /></div>
        <div className="campo"><label>Bodega</label>
          <select name="bodega" defaultValue={p.bodega ?? ''}><option value="">Todas</option>{bods.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select>
        </div>
        <div className="campo"><label>Mostrar</label>
          <select name="solo" defaultValue={p.solo ?? ''}><option value="">Todos</option><option value="con">Con stock</option><option value="negativo">Stock negativo</option></select>
        </div>
        <button className="btn">Buscar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>Sin existencias registradas.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Código</th><th>Producto</th><th>Bodega</th><th className="num">Stock</th><th></th></tr></thead>
              <tbody>{filas.map((f) => (
                <tr key={f.id}>
                  <td className="nowrap">{f.codigo}</td><td>{f.nombre}</td><td>{f.bodega}</td>
                  <td className="num" style={{ color: f.stock < 0 ? 'var(--danger)' : undefined }}>{f.stock}</td>
                  <td><Link href={`/reportes/kardex?producto=${f.id_producto}`}>Kardex</Link></td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={n} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
