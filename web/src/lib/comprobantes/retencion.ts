import 'server-only';
import type { ManejadorComprobante } from './tipos';

// PENDIENTE: implementar construirXml, modeloRide y datosCorreo (ver factura.ts como referencia)
async function noImplementado(): Promise<never> {
  throw new Error('Comprobante de retención: emisión electrónica aún no implementada');
}

export const retencion: ManejadorComprobante = {
  tipoDoc: 6,
  codDoc: '07',
  nombre: 'Comprobante de retención',
  tabla: 'retencion',
  colClave: 'clave_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_emision',
  ruta: '/retenciones',
  construirXml: noImplementado,
  modeloRide: noImplementado,
  datosCorreo: noImplementado,
};
