import 'server-only';
import type { ManejadorComprobante } from './tipos';
import { factura } from './factura';
import { liquidacionCompra } from './liquidacion_compra';
import { notaCredito } from './nota_credito';
import { notaDebito } from './nota_debito';
import { guiaRemision } from './guia_remision';
import { retencion } from './retencion';

/** Registro de tipos de comprobante emitibles (id de tipo_documento -> manejador). */
const MANEJADORES: Record<number, ManejadorComprobante> = {
  1: factura,
  2: liquidacionCompra,
  3: notaCredito,
  4: notaDebito,
  5: guiaRemision,
  6: retencion,
};

export function manejador(tipoDoc: number): ManejadorComprobante {
  const m = MANEJADORES[tipoDoc];
  if (!m) throw new Error(`Tipo de comprobante ${tipoDoc} no implementado`);
  return m;
}
