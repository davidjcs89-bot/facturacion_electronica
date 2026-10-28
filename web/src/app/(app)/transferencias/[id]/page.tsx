import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { fecha, fechaHora } from '@/lib/formato';
import { NOMBRE_TRANSF, TRANSF } from '../estados';
import { AccionesTransferencia } from '../Formularios';
import { eliminarTransferencia } from '../actions';

export default async function VerTransferencia({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [t] = await sql<{ fecha_creacion: Date; fecha_finalizacion: Date | null; desde: string; hasta: string; estado: number; id_bodega_desde: number }[]>`
    select t.fecha_creacion, t.fecha_finalizacion, bd.nombre desde, bh.nombre hasta, t.estado, t.id_bodega_desde
    from transferencia_inventario t join bodegas bd on bd.id = t.id_bodega_desde join bodegas bh on bh.id = t.id_bodega_hasta
    where t.id = ${id} and t.id_emisor = ${s.emisorId}`;
  if (!t) notFound();
  const det = await sql<{ id: number; codigo: string; nombre: string; cantidad: number; stock_origen: number }[]>`
    select d.id, p.codigo, p.nombre, d.cantidad,
      (select coalesce(sum(stock), 0) from productos_x_bodega x where x.id_producto = d.id_producto and x.id_bodega = ${t.id_bodega_desde}) stock_origen
    from detalle_transferencia_inventario d join producto p on p.id = d.id_producto where d.id_transferencia = ${id} order by d.id`;
  const pendiente = t.estado === TRANSF.PENDIENTE;
  return (
    <>
      <Cabecera titulo={`Transferencia N.º ${id}`} sub={<>{t.desde} → {t.hasta} · creada {fecha(t.fecha_creacion)}{t.fecha_finalizacion ? ` · finalizada ${fechaHora(t.fecha_finalizacion)}` : ''} · <span className={`badge ${NOMBRE_TRANSF[t.estado]?.[1]}`}>{NOMBRE_TRANSF[t.estado]?.[0]}</span></>}>
        {pendiente && <form action={eliminarTransferencia}><input type="hidden" name="id" value={id} /><button className="btn peligro">Eliminar</button></form>}
        <Link className="btn" href="/transferencias">Volver</Link>
      </Cabecera>
      <AccionesTransferencia id={id} pendiente={pendiente} anulable={t.estado !== TRANSF.ANULADO} />
      <div className="card sin-padding">
        <table className="tabla">
          <thead><tr><th>Código</th><th>Producto</th><th className="num">Cantidad</th>{pendiente && <th className="num">Stock en origen</th>}</tr></thead>
          <tbody>{det.map((d) => (
            <tr key={d.id}><td>{d.codigo}</td><td>{d.nombre}</td><td className="num">{d.cantidad}</td>
              {pendiente && <td className="num" style={{ color: d.stock_origen < d.cantidad ? 'var(--danger)' : undefined }}>{d.stock_origen}</td>}</tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
}
