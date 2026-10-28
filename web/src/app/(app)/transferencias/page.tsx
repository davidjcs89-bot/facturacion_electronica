import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Vacio } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { NOMBRE_TRANSF } from './estados';


export default async function Transferencias() {
  const s = await requerirEmisor();
  const filas = await sql<{ id: number; fecha_creacion: Date; desde: string; hasta: string; estado: number; unidades: number }[]>`
    select t.id, t.fecha_creacion, bd.nombre desde, bh.nombre hasta, t.estado,
      (select coalesce(sum(cantidad), 0) from detalle_transferencia_inventario d where d.id_transferencia = t.id) unidades
    from transferencia_inventario t join bodegas bd on bd.id = t.id_bodega_desde join bodegas bh on bh.id = t.id_bodega_hasta
    where t.id_emisor = ${s.emisorId} order by t.id desc limit 200`;
  return (
    <>
      <Cabecera titulo="Transferencias entre bodegas"><Link className="btn primario" href="/transferencias/nueva">+ Nueva transferencia</Link></Cabecera>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay transferencias.</Vacio> : (
          <table className="tabla">
            <thead><tr><th>N.º</th><th>Fecha</th><th>Desde</th><th>Hasta</th><th className="num">Unidades</th><th>Estado</th></tr></thead>
            <tbody>{filas.map((t) => (
              <tr key={t.id}><td><Link href={`/transferencias/${t.id}`}>{t.id}</Link></td><td>{fecha(t.fecha_creacion)}</td><td>{t.desde}</td><td>{t.hasta}</td>
                <td className="num">{t.unidades}</td><td><span className={`badge ${NOMBRE_TRANSF[t.estado]?.[1]}`}>{NOMBRE_TRANSF[t.estado]?.[0]}</span></td></tr>))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
