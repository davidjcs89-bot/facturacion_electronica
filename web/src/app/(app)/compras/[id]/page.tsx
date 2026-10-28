import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { money, fecha } from '@/lib/formato';
import { BotonAnular } from '../Formularios';

export default async function VerCompra({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [c] = await sql<{ fecha: Date; numero: string; clave: string | null; proveedor: string; ruc: string; total_sin_impuestos: number; total_descuento: number; total: number; estado: number; bodega: string; id_cliente: number }[]>`
    select x.fecha, x.numero, x.clave, c.nombre_cliente proveedor, c.identificacion ruc, x.total_sin_impuestos, x.total_descuento, x.total, x.estado, b.nombre bodega, x.id_cliente
    from compra x join clientes c on c.id = x.id_cliente left join bodegas b on b.id = x.id_bodega where x.id = ${id} and x.id_emisor = ${s.emisorId}`;
  if (!c) notFound();
  const det = await sql<{ id: number; codigo: string; descripcion: string; cantidad: number; precio: number; descuento: number; precio_sin_impuestos: number; iva: number }[]>`
    select d.id, d.codigo, d.descripcion, d.cantidad, d.precio, d.descuento, d.precio_sin_impuestos,
      (select coalesce(sum(valor), 0) from impuesto_detalle_compra i where i.id_detalle = d.id and i.codigo = '2') iva
    from detalle_compra d where d.id_compra = ${id} order by d.id`;
  const imps = await sql<{ codigo: string; codigo_porcentaje: string; base_imponible: number; valor: number }[]>`select codigo, codigo_porcentaje, base_imponible, valor from impuestos_compra where id_compra = ${id}`;
  return (
    <>
      <Cabecera titulo={`Compra ${c.numero}`} sub={<>{c.proveedor} · {fecha(c.fecha)} · bodega {c.bodega}{c.estado === 8 && <> · <span className="badge e8">Anulada</span></>}</>}>
        <Link className="btn" href="/compras">Volver</Link>
      </Cabecera>
      <div className="grid c2">
        <div className="card">
          <dl className="datos">
            <dt>Proveedor</dt><dd><Link href={`/clientes/${c.id_cliente}`}>{c.proveedor}</Link> · {c.ruc}</dd>
            <dt>Clave de acceso</dt><dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.clave || '—'}</dd>
          </dl>
          {c.estado !== 8 && <div style={{ marginTop: 12 }}><BotonAnular id={id} /></div>}
        </div>
        <div className="card">
          <table className="totales" style={{ width: '100%' }}><tbody>
            <tr><td>Subtotal sin impuestos</td><td className="derecha">{money(c.total_sin_impuestos)}</td></tr>
            <tr><td>Descuento</td><td className="derecha">{money(c.total_descuento)}</td></tr>
            {imps.map((i, k) => <tr key={k}><td>Impuesto {i.codigo === '2' ? 'IVA' : i.codigo === '3' ? 'ICE' : i.codigo} (cód. {i.codigo_porcentaje}) sobre {money(i.base_imponible)}</td><td className="derecha">{money(i.valor)}</td></tr>)}
            <tr className="total"><td>Total</td><td className="derecha">${money(c.total)}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="card sin-padding">
        <table className="tabla">
          <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">Costo unit.</th><th className="num">Desc.</th><th className="num">Subtotal</th><th className="num">IVA</th></tr></thead>
          <tbody>{det.map((d) => (
            <tr key={d.id}><td>{d.codigo}</td><td>{d.descripcion}</td><td className="num">{d.cantidad}</td><td className="num">{money(d.precio)}</td>
              <td className="num">{money(d.descuento)}</td><td className="num">{money(d.precio_sin_impuestos)}</td><td className="num">{money(d.iva)}</td></tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
}
