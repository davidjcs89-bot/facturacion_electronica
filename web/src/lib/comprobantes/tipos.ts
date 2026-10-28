import type { ModeloRide } from '../sri/ride';

/** Datos de autorizacion que se agregan al RIDE */
export type DatosAutorizacion = { numeroAutorizacion?: string | null; fechaAutorizacion?: string | null };

/** Lo que cada tipo de comprobante debe implementar para poder emitirse electronicamente */
export type ManejadorComprobante = {
  tipoDoc: number; // id en tipo_documento (1 factura, 2 liquidacion, 3 NC, 4 ND, 5 guia, 6 retencion)
  codDoc: string; // codigo SRI (01, 03, 04, 05, 06, 07)
  nombre: string; // "Factura"
  tabla: string; // tabla principal
  colClave: string; // columna de clave de acceso
  colNumero: string; // columna del numero (estab-pto-secuencial)
  colEmisor: string; // columna del emisor
  colPunto: string; // columna del punto de emision
  colFecha: string; // columna de la fecha usada en la clave de acceso
  ruta: string; // ruta base en la app, p.ej. /facturas
  /** XML canonico (sin firma) del comprobante, armado desde la base */
  construirXml(id: number): Promise<string>;
  /** Modelo para el RIDE en PDF */
  modeloRide(id: number, aut: DatosAutorizacion): Promise<ModeloRide>;
  /** Datos para el correo al receptor */
  datosCorreo(id: number): Promise<{ correo: string | null; receptor: string; numero: string; total: number | null }>;
};
