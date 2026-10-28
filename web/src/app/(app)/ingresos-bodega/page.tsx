import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { fecha } from '@/lib/formato';

const POR_PAGINA = 50;

export default async function Ingresos({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const [{ n }] = await sql<{ n: number }[]>`select count(*) n from ingresos_bodega where id_emisor = ${s.emisorId}`;
  const filas = await sql<{ id: number; fecha: Date; bodega: string; productos: number; unidades: number }[]>`
    select i.id, i.fecha, b.nombre bodega, count(d.id) productos, coalesce(sum(d.cantidad), 0) unidades
    from ingresos_bodega i join bodegas b on b.id = i.id_bodega left join ingresos_bodega_detalle d on d.id_ingreso = i.id
    where i.id_emisor = ${s.emisorId} group by i.id, b.nombre order by i.fecha desc, i.id desc
    limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Ingresos de existencias"><Link className="btn primario" href="/ingresos-bodega/nuevo">+ Nuevo ingreso</Link></Cabecera>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay ingresos registrados.</Vacio> : (
          <table className="tabla">
            <thead><tr><th>N.º</th><th>Fecha</th><th>Bodega</th><th className="num">Productos</th><th className="num">Unidades</th></tr></thead>
            <tbody>{filas.map((f) => (
              <tr key={f.id}><td><Link href={`/ingresos-bodega/${f.id}`}>{f.id}</Link></td><td>{fecha(f.fecha)}</td><td>{f.bodega}</td>
                <td className="num">{f.productos}</td><td className="num">{f.unidades}</td></tr>))}
            </tbody>
          </table>
        )}
        <Paginacion pagina={pagina} total={n} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
