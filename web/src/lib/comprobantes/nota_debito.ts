import 'server-only';
import type { ManejadorComprobante } from './tipos';

// PENDIENTE: implementar construirXml, modeloRide y datosCorreo (ver factura.ts como referencia)
async function noImplementado(): Promise<never> {
  throw new Error('Nota de débito: emisión electrónica aún no implementada');
}

export const notaDebito: ManejadorComprobante = {
  tipoDoc: 4,
  codDoc: '05',
  nombre: 'Nota de débito',
  tabla: 'nota_debito',
  colClave: 'clave_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisior',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_emision',
  ruta: '/notas-debito',
  construirXml: noImplementado,
  modeloRide: noImplementado,
  datosCorreo: noImplementado,
};
