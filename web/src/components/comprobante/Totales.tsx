import { money } from '@/lib/formato';

export type TotalesDoc = {
  subtotal_iva?: number; subtotal_iva_cero?: number; subtotal_no_objeto_iva?: number; subtotal_excento_iva?: number;
  subtotal_sin_impuestos?: number; total_descuento?: number; valor_iva?: number; valor_ice?: number; valor_irbpnr?: number;
  propina?: number; total: number;
};

export function Totales({ f }: { f: TotalesDoc }) {
  const filas: [string, number | undefined, boolean][] = [
    ['Subtotal con IVA', f.subtotal_iva, false],
    ['Subtotal 0%', f.subtotal_iva_cero, false],
    ['Subtotal no objeto de IVA', f.subtotal_no_objeto_iva, false],
    ['Subtotal exento de IVA', f.subtotal_excento_iva, false],
    ['Subtotal sin impuestos', f.subtotal_sin_impuestos, true],
    ['Descuento', f.total_descuento, false],
    ['ICE', f.valor_ice, false],
    ['IVA', f.valor_iva, true],
    ['IRBPNR', f.valor_irbpnr, false],
    ['Propina', f.propina, false],
  ];
  return (
    <div className="card">
      <table className="totales" style={{ width: '100%' }}>
        <tbody>
          {filas
            .filter(([, v, siempre]) => v !== undefined && (siempre || Number(v) !== 0))
            .map(([k, v]) => (
              <tr key={k}><td>{k}</td><td className="derecha">{money(v)}</td></tr>
            ))}
          <tr className="total"><td>Total</td><td className="derecha">${money(f.total)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
