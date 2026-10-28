import { requerirEmisor } from '@/lib/auth';
import { leerParams, type SP } from '@/lib/params';
import { Cabecera, Vacio } from '@/components/ui';
import { money } from '@/lib/formato';
import { reporteFacturas, rangoPorDefecto } from './datos';

export default async function ReporteFacturas({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const { desde, hasta } = rangoPorDefecto(p);
  const filas = await reporteFacturas(s.emisorId, desde, hasta);
  const suma = (k: 'Subtotal_iva' | 'Subtotal_iva_cero' | 'Valor_iva' | 'Total') => filas.reduce((a, f) => a + Number(f[k] ?? 0), 0);
  return (
    <>
      <Cabecera titulo="Facturas autorizadas" sub={`${filas.length} facturas · total $${money(suma('Total'))}`}>
        <a className="btn" href={`/reportes/facturas/csv?desde=${desde}&hasta=${hasta}`}>Descargar Excel (CSV)</a>
      </Cabecera>
      <form className="filtros">
        <div className="campo"><label>Desde</label><input type="date" name="desde" defaultValue={desde} /></div>
        <div className="campo"><label>Hasta</label><input type="date" name="hasta" defaultValue={hasta} /></div>
        <button className="btn">Consultar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay facturas autorizadas en el período.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Fecha</th><th>Número</th><th>Cliente</th><th>Identificación</th><th>Forma de pago</th><th className="num">Base IVA</th><th className="num">Base 0%</th><th className="num">IVA</th><th className="num">Total</th></tr></thead>
              <tbody>{filas.map((f) => (
                <tr key={f.Clave_de_Acceso}>
                  <td className="nowrap">{f.Fecha_emision}</td><td className="nowrap">{f.Numero}</td><td>{f.cliente}</td><td>{f.nid_cliente}</td>
                  <td>{f.forma_pago}</td><td className="num">{money(f.Subtotal_iva)}</td><td className="num">{money(f.Subtotal_iva_cero)}</td>
                  <td className="num">{money(f.Valor_iva)}</td><td className="num">{money(f.Total)}</td>
                </tr>))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Totales</td><td className="num">{money(suma('Subtotal_iva'))}</td><td className="num">{money(suma('Subtotal_iva_cero'))}</td><td className="num">{money(suma('Valor_iva'))}</td><td className="num">{money(suma('Total'))}</td></tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
