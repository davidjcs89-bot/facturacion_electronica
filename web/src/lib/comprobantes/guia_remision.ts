import 'server-only';
import type { ManejadorComprobante } from './tipos';

// PENDIENTE: implementar construirXml, modeloRide y datosCorreo (ver factura.ts como referencia)
async function noImplementado(): Promise<never> {
  throw new Error('Guía de remisión: emisión electrónica aún no implementada');
}

export const guiaRemision: ManejadorComprobante = {
  tipoDoc: 5,
  codDoc: '06',
  nombre: 'Guía de remisión',
  tabla: 'guia_remision',
  colClave: 'clave_acceso',
  colNumero: 'numero_comprobante',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_inicio_transporte',
  ruta: '/guias-remision',
  construirXml: noImplementado,
  modeloRide: noImplementado,
  datosCorreo: noImplementado,
};
