import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, type SP } from '@/lib/params';
import { fechaInput } from '@/lib/formato';
import { Alerta, Cabecera } from '@/components/ui';
import { opcionesImpuestos } from '../datos';
import { FormProducto } from '../FormProducto';
import { eliminarProducto } from '../actions';
import { BotonBorrar } from '../../admin/_comun/BotonBorrar';

export default async function EditarProducto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const p = await leerParams(searchParams);
  const [prod] = await sql`select * from producto where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!prod) notFound();
  const [op, atributos, stock] = await Promise.all([
    opcionesImpuestos(),
    sql<{ atributo: string; valor: string }[]>`select atributo, valor from atributos_adicionales_producto where id_producto = ${id} order by id`,
    sql<{ bodega: string; stock: number }[]>`
      select b.nombre bodega, x.stock from productos_x_bodega x join bodegas b on b.id = x.id_bodega where x.id_producto = ${id} order by b.nombre`,
  ]);
  return (
    <>
      <Cabecera titulo={prod.nombre} sub={`Código ${prod.codigo}`}>
        <Link className="btn" href={`/reportes/kardex?producto=${id}`}>Kardex</Link>
        <Link className="btn" href="/productos">Volver</Link>
      </Cabecera>
      {p.guardado && <Alerta tipo="ok">Producto guardado.</Alerta>}
      {p.error === 'uso' && <Alerta tipo="error">No se puede eliminar: el producto está usado en comprobantes o movimientos de inventario.</Alerta>}
      <FormProducto
        p={{ ...prod, fecha_elavoracionproducto: fechaInput(prod.fecha_elavoracionproducto), fecha_caducidadproducto: fechaInput(prod.fecha_caducidadproducto) }}
        {...op} atributos={atributos} ivaPorDefecto={prod.codigo_iva} />
      <div className="grid c2">
        <div className="card">
          <h2>Existencias por bodega</h2>
          {stock.length === 0 ? <p className="muted">Sin existencias registradas.</p> : (
            <table className="tabla"><tbody>{stock.map((x) => <tr key={x.bodega}><td>{x.bodega}</td><td className="num">{x.stock}</td></tr>)}</tbody></table>
          )}
        </div>
        <div className="card">
          <h2>Eliminar</h2>
          <p className="muted">Solo se puede eliminar si no se ha usado en ningún comprobante.</p>
          <form action={eliminarProducto}><input type="hidden" name="id" value={id} /><BotonBorrar texto="Eliminar producto" /></form>
        </div>
      </div>
    </>
  );
}
