import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, type SP } from '@/lib/params';
import { Cabecera, Vacio, Alerta } from '@/components/ui';
import { money, fechaHora } from '@/lib/formato';
import { ElegirProducto } from './ElegirProducto';

type Mov = { fecha: string; referencia: string; transaccion: string; bodega: string; ingreso?: number; egreso?: number; saldo: number; costo?: number; total?: number };

export default async function Kardex({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(p.desde ?? '') ? p.desde! : `${hoy.slice(0, 4)}-01-01`;
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(p.hasta ?? '') ? p.hasta! : hoy;
  const idProd = Number(p.producto) || 0;
  const [prod] = idProd
    ? await sql<{ id: number; codigo: string; nombre: string; stock: number }[]>`
        select id, codigo, nombre, (select coalesce(sum(stock), 0) from productos_x_bodega x where x.id_producto = p.id) stock
        from producto p where id = ${idProd} and id_emisor = ${s.emisorId}`
    : [];
  let movs: Mov[] = [];
  let ultimos: Mov[] = [];
  if (prod) {
    const [r] = await sql<{ f: { data: Mov[] } | null; u: { data: Mov[] } | null }[]>`
      select sp_kardex_fechas(${prod.id}, ${desde}, ${hasta + ' 23:59:59'}) f, sp_kardex_ultimas(${prod.id}) u`;
    movs = r.f?.data ?? [];
    ultimos = r.u?.data ?? [];
  }
  const tabla = (lista: Mov[]) => (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead><tr><th>Fecha</th><th>Transacción</th><th>Referencia</th><th>Bodega</th><th className="num">Ingreso</th><th className="num">Egreso</th><th className="num">Saldo</th><th className="num">Costo/Precio</th><th className="num">Total</th></tr></thead>
        <tbody>{lista.map((m, i) => (
          <tr key={i}>
            <td className="nowrap">{fechaHora(m.fecha)}</td><td>{m.transaccion}</td><td className="nowrap">{m.referencia}</td><td>{m.bodega}</td>
            <td className="num">{m.ingreso || ''}</td><td className="num">{m.egreso || ''}</td><td className="num">{m.saldo}</td>
            <td className="num">{m.costo ? money(m.costo) : ''}</td><td className="num">{m.total ? money(m.total) : ''}</td>
          </tr>))}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <Cabecera titulo="Kardex de producto" sub={prod ? `${prod.codigo} · ${prod.nombre} · stock actual en bodegas: ${prod.stock}` : 'Elija un producto'} />
      <div className="card">
        <div className="filtros" style={{ marginBottom: 0 }}>
          <div className="campo busqueda"><label>Producto</label><ElegirProducto desde={desde} hasta={hasta} /></div>
        </div>
        {prod && (
          <form className="filtros" style={{ marginTop: 10, marginBottom: 0 }}>
            <input type="hidden" name="producto" value={prod.id} />
            <div className="campo"><label>Desde</label><input type="date" name="desde" defaultValue={desde} /></div>
            <div className="campo"><label>Hasta</label><input type="date" name="hasta" defaultValue={hasta} /></div>
            <button className="btn">Consultar</button>
          </form>
        )}
      </div>
      {idProd > 0 && !prod && <Alerta tipo="error">Producto no encontrado.</Alerta>}
      {prod && (
        <>
          <Alerta tipo="info">El saldo se calcula desde los ingresos de bodega, compras, facturas autorizadas y notas de crédito registrados en el sistema; puede no coincidir con el stock actual si hubo ajustes.</Alerta>
          <div className="card sin-padding"><div style={{ padding: '14px 16px 0' }}><h2>Movimientos del {desde.split('-').reverse().join('/')} al {hasta.split('-').reverse().join('/')}</h2></div>
            {movs.length ? tabla(movs) : <Vacio>Sin movimientos en el período.</Vacio>}
          </div>
          <div className="card sin-padding"><div style={{ padding: '14px 16px 0' }}><h2>Últimos 10 movimientos</h2></div>
            {ultimos.length ? tabla(ultimos) : <Vacio>Sin movimientos.</Vacio>}
          </div>
          <Link href={`/existencias?q=${encodeURIComponent(prod.codigo)}`}>Ver existencias por bodega</Link>
        </>
      )}
    </>
  );
}
