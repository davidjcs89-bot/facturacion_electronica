import { XMLParser } from 'fast-xml-parser';

export type ImpuestoXml = { codigo: string; codigoPorcentaje: string; tarifa: number; baseImponible: number; valor: number };
export type DetalleXml = {
  codigo: string; descripcion: string; cantidad: number; precioUnitario: number; descuento: number;
  precioTotalSinImpuesto: number; impuestos: ImpuestoXml[];
};
export type FacturaProveedor = {
  ruc: string; razonSocial: string; dirMatriz: string; claveAcceso: string; numero: string; fechaEmision: string; // yyyy-mm-dd
  totalSinImpuestos: number; totalDescuento: number; total: number; impuestos: ImpuestoXml[]; detalles: DetalleXml[];
};

const lista = <T,>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const num = (x: unknown) => Number(String(x ?? '0').replace(',', '.')) || 0;
const txt = (x: unknown) => (x == null ? '' : String(x).trim());

function decodificar(s: string) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** Extrae la factura del XML autorizado del SRI (con o sin envoltura de autorizacion, CDATA o escapado). */
export function leerFacturaProveedor(contenido: string): FacturaProveedor {
  let s = contenido.replace(/^﻿/, '');
  if (!/<factura[\s>]/.test(s) && /&lt;factura[\s&]/.test(s)) s = decodificar(s);
  s = s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
  const i = s.search(/<factura[\s>]/);
  const f = s.indexOf('</factura>');
  if (i < 0 || f < 0) throw new Error('El archivo no contiene una factura electrónica (solo se pueden importar facturas)');
  const xml = s.slice(i, f + '</factura>'.length);
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', removeNSPrefix: true, parseTagValue: false, trimValues: true });
  const doc = p.parse(xml)?.factura;
  if (!doc?.infoTributaria || !doc?.infoFactura) throw new Error('Estructura de factura no reconocida');
  const it = doc.infoTributaria;
  const inf = doc.infoFactura;
  const imp = (x: Record<string, unknown>): ImpuestoXml => ({
    codigo: txt(x.codigo), codigoPorcentaje: txt(x.codigoPorcentaje), tarifa: num(x.tarifa), baseImponible: num(x.baseImponible), valor: num(x.valor),
  });
  const [d, m, a] = txt(inf.fechaEmision).split('/');
  return {
    ruc: txt(it.ruc),
    razonSocial: txt(it.razonSocial),
    dirMatriz: txt(it.dirMatriz),
    claveAcceso: txt(it.claveAcceso),
    numero: `${txt(it.estab)}-${txt(it.ptoEmi)}-${txt(it.secuencial)}`,
    fechaEmision: a && m && d ? `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '',
    totalSinImpuestos: num(inf.totalSinImpuestos),
    totalDescuento: num(inf.totalDescuento),
    total: num(inf.importeTotal),
    impuestos: lista(inf.totalConImpuestos?.totalImpuesto).map(imp),
    detalles: lista(doc.detalles?.detalle).map((x: Record<string, unknown>) => ({
      codigo: txt(x.codigoPrincipal) || txt(x.codigoInterno) || txt(x.codigoAuxiliar) || 'SIN-CODIGO',
      descripcion: txt(x.descripcion),
      cantidad: num(x.cantidad),
      precioUnitario: num(x.precioUnitario),
      descuento: num(x.descuento),
      precioTotalSinImpuesto: num(x.precioTotalSinImpuesto),
      impuestos: lista((x.impuestos as { impuesto?: unknown } | undefined)?.impuesto as Record<string, unknown>[]).map(imp),
    })),
  };
}
