/** Calculos de lineas de detalle (factura, proforma, pedido, liquidacion) */

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export type Impuestos = { ivaPct: number; icePct: number; irbpnrPct: number };

export type LineaCalculada = {
  precio_unitario: number; // sin IVA, 3 decimales
  cantidad: number;
  descuento: number;
  decuento_porcentaje: number;
  sub_total: number; // sin impuestos, con descuento aplicado
  valor_iva: number;
  valor_ice: number;
  valor_irbpnr: number;
  total: number;
};

/**
 * @param precio precio unitario
 * @param incluyeIva true si el precio ingresado ya incluye IVA (P.V.P.)
 */
export function calcularLinea(precio: number, cantidad: number, descuentoPct: number, imp: Impuestos, incluyeIva: boolean): LineaCalculada {
  const sinIva = incluyeIva ? precio / (1 + imp.ivaPct / 100) : precio;
  const precioUnit = r3(sinIva);
  const bruto = precioUnit * cantidad;
  const descuento = r2(bruto * (descuentoPct / 100));
  const sub = r2(bruto - descuento);
  const ice = r2(sub * (imp.icePct / 100));
  const irbpnr = r2(sub * (imp.irbpnrPct / 100));
  const iva = r2((sub + ice) * (imp.ivaPct / 100));
  return {
    precio_unitario: precioUnit,
    cantidad,
    descuento,
    decuento_porcentaje: descuentoPct,
    sub_total: sub,
    valor_iva: iva,
    valor_ice: ice,
    valor_irbpnr: irbpnr,
    total: r2(sub + iva + ice + irbpnr),
  };
}

/** Clasificacion de la base imponible segun el porcentaje de IVA del producto (id en porcentaje_impuesto_producto) */
export const IVA_CERO = 1;
export const NO_OBJETO_IVA = 4;
export const EXENTO_IVA = 5;
