import 'server-only';
import type { ManejadorComprobante } from './tipos';

// PENDIENTE: implementar construirXml, modeloRide y datosCorreo (ver factura.ts como referencia)
async function noImplementado(): Promise<never> {
  throw new Error('Nota de crédito: emisión electrónica aún no implementada');
}

export const notaCredito: ManejadorComprobante = {
  tipoDoc: 3,
  codDoc: '04',
  nombre: 'Nota de crédito',
  tabla: 'nota_credito',
  colClave: 'clave_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_emision',
  ruta: '/notas-credito',
  construirXml: noImplementado,
  modeloRide: noImplementado,
  datosCorreo: noImplementado,
};
