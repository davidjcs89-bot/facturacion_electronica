import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Vacio } from '@/components/ui';

export default async function Bodegas() {
  const s = await requerirEmisor();
  const filas = await sql<{ id: number; codigo: string; nombre: string; activa: boolean; productos: number; unidades: number; puntos: number }[]>`
    select b.id, b.codigo, b.nombre, b.activa,
      (select count(*) from productos_x_bodega x where x.id_bodega = b.id and x.stock <> 0) productos,
      (select coalesce(sum(stock), 0) from productos_x_bodega x where x.id_bodega = b.id) unidades,
      (select count(*) from puntos_emisior p where p.id_bodega = b.id) puntos
    from bodegas b where b.id_emisor = ${s.emisorId} order by b.nombre`;
  return (
    <>
      <Cabecera titulo="Bodegas"><Link className="btn primario" href="/bodegas/nueva">+ Nueva bodega</Link></Cabecera>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay bodegas.</Vacio> : (
          <table className="tabla">
            <thead><tr><th>Código</th><th>Nombre</th><th className="num">Productos con stock</th><th className="num">Unidades</th><th className="num">Puntos de emisión</th><th>Estado</th></tr></thead>
            <tbody>{filas.map((b) => (
              <tr key={b.id}>
                <td><Link href={`/bodegas/${b.id}`}>{b.codigo}</Link></td><td>{b.nombre}</td>
                <td className="num">{b.productos}</td><td className="num">{b.unidades}</td><td className="num">{b.puntos}</td>
                <td>{b.activa ? <span className="badge e6">Activa</span> : <span className="badge e1">Inactiva</span>}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
