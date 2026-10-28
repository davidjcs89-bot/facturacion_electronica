import 'server-only';
import type { ManejadorComprobante } from './tipos';

// PENDIENTE: implementar construirXml, modeloRide y datosCorreo (ver factura.ts como referencia)
async function noImplementado(): Promise<never> {
  throw new Error('Liquidación de compra: emisión electrónica aún no implementada');
}

export const liquidacionCompra: ManejadorComprobante = {
  tipoDoc: 2,
  codDoc: '03',
  nombre: 'Liquidación de compra',
  tabla: 'liquidacion_compra',
  colClave: 'clave_de_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emison',
  colFecha: 'fecha_emision',
  ruta: '/liquidaciones',
  construirXml: noImplementado,
  modeloRide: noImplementado,
  datosCorreo: noImplementado,
};
