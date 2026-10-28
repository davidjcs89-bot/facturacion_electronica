import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { eliminarIngreso } from '../actions';

export default async function VerIngreso({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [i] = await sql<{ fecha: Date; bodega: string }[]>`select i.fecha, b.nombre bodega from ingresos_bodega i join bodegas b on b.id = i.id_bodega where i.id = ${id} and i.id_emisor = ${s.emisorId}`;
  if (!i) notFound();
  const det = await sql<{ id: number; codigo: string; nombre: string; cantidad: number }[]>`
    select d.id, p.codigo, p.nombre, d.cantidad from ingresos_bodega_detalle d join producto p on p.id = d.id_producto where d.id_ingreso = ${id} order by d.id`;
  return (
    <>
      <Cabecera titulo={`Ingreso N.º ${id}`} sub={`${i.bodega} · ${fecha(i.fecha)}`}>
        <form action={eliminarIngreso}><input type="hidden" name="id" value={id} /><button className="btn peligro">Eliminar y revertir stock</button></form>
        <Link className="btn" href="/ingresos-bodega">Volver</Link>
      </Cabecera>
      <div className="card sin-padding">
        <table className="tabla">
          <thead><tr><th>Código</th><th>Producto</th><th className="num">Cantidad</th></tr></thead>
          <tbody>{det.map((d) => <tr key={d.id}><td>{d.codigo}</td><td>{d.nombre}</td><td className="num">{d.cantidad}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
