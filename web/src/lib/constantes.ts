export const ESTADO = {
  PENDIENTE: 1,
  PAGADO: 2,
  FINALIZADO: 3,
  RECIBIDO: 4,
  NO_RECIBIDO: 5,
  AUTORIZADO: 6,
  NO_AUTORIZADO: 7,
  ANULADO: 8,
} as const;

export const NOMBRE_ESTADO: Record<number, string> = {
  1: 'Pendiente',
  2: 'Pagado',
  3: 'Finalizado',
  4: 'Recibido SRI',
  5: 'No recibido',
  6: 'Autorizado',
  7: 'No autorizado',
  8: 'Anulado',
};

export const TIPO_DOC = {
  FACTURA: 1,
  LIQUIDACION_COMPRA: 2,
  NOTA_CREDITO: 3,
  NOTA_DEBITO: 4,
  GUIA_REMISION: 5,
  RETENCION: 6,
} as const;

/** Codigos SRI de tipo de comprobante */
export const CODIGO_SRI: Record<number, string> = { 1: '01', 2: '03', 3: '04', 4: '05', 5: '06', 6: '07' };

export const TIPO_IDENTIFICACION = { RUC: 1, CEDULA: 2, PASAPORTE: 3, CONSUMIDOR_FINAL: 4, EXTERIOR: 5 } as const;
export const TIPO_CLIENTE = { CLIENTE: 1, SUJETO_RETENCION: 2, DESTINATARIO: 3, PROVEEDOR: 4 } as const;
export const ID_CONSUMIDOR_FINAL = 1;
export const IDENTIFICACION_CONSUMIDOR_FINAL = '9999999999999';
export const MONTO_MAXIMO_CONSUMIDOR_FINAL = 50;

export const TIEMPOS_PAGO = ['NINGUNO', 'DIAS', 'MESES', 'AÑOS'];

/**
 * Ficha tecnica SRI v2.34, Anexo 26 (Resolucion NAC-DGERCGC26-00000027): los comprobantes emitidos con un sistema
 * de facturacion de un tercero llevan en infoAdicional el campo «RUC Proveedor» con el RUC del proveedor del sistema.
 */
export const CAMPO_RUC_PROVEEDOR = 'RUC Proveedor';
export const RUC_PROVEEDOR_SISTEMA = process.env.RUC_PROVEEDOR_SISTEMA?.trim() || '0301741575001';

/** Agrega «RUC Proveedor» a los campos adicionales (quitando uno igual que haya escrito el usuario) */
export function conRucProveedor<T extends { nombre: string; descripcion: string }>(campos: T[]): { nombre: string; descripcion: string }[] {
  const otros = campos.filter((c) => c.nombre?.trim().toLowerCase() !== CAMPO_RUC_PROVEEDOR.toLowerCase());
  return [...otros, { nombre: CAMPO_RUC_PROVEEDOR, descripcion: RUC_PROVEEDOR_SISTEMA }];
}
