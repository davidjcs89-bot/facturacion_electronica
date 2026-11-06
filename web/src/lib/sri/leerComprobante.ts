import { XMLParser } from 'fast-xml-parser';
import { r2 } from '../comprobantes/calculos';

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });
const lista = <T,>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

export type DatosFactura = {
  ruc: string; razonSocial: string; direccion: string | null; codDoc: string; numero: string; fecha: string;
  comprador: string; baseRenta: number; ivaValor: number;
};

/** Lee el XML de una factura (o nota de debito/liquidacion) del proveedor, autorizado o no */
export function leerComprobante(xml: string): DatosFactura {
  // Formas reales: <factura> sola; <autorizacion><comprobante> con CDATA o con el XML anidado; <comprobante> suelto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buscar = (nodo: unknown, prof = 0): Record<string, any> | null => {
    if (nodo == null || prof > 6) return null;
    if (typeof nodo === 'string') return nodo.includes('<') ? buscar(parser.parse(nodo), prof + 1) : null;
    if (typeof nodo !== 'object') return null;
    const o = nodo as Record<string, unknown>;
    for (const k of ['factura', 'notaDebito', 'liquidacionCompra']) if (o[k] && typeof o[k] === 'object') return o[k] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const k of ['autorizacion', 'comprobante', 'RespuestaAutorizacionComprobante', 'autorizaciones']) {
      const r = buscar(o[k], prof + 1);
      if (r) return r;
    }
    return null;
  };
  const raiz = buscar(parser.parse(xml));
  if (!raiz?.infoTributaria) throw new Error('El archivo no parece una factura electrónica del SRI (XML).');
  const it = raiz.infoTributaria;
  const info = raiz.infoFactura ?? raiz.infoNotaDebito ?? raiz.infoLiquidacionCompra ?? {};
  const [d, m, a] = String(info.fechaEmision ?? '').split('/');
  if (!a) throw new Error('El XML no tiene fecha de emisión válida.');
  const impuestos = lista(info.totalConImpuestos?.totalImpuesto ?? info.impuestos?.impuesto) as Record<string, string>[];
  const iva = impuestos.filter((t) => String(t.codigo) === '2');
  const ivaValor = iva.reduce((s, t) => s + Number(t.valor ?? 0), 0);
  const baseRenta = Number(info.totalSinImpuestos ?? 0) || impuestos.reduce((s, t) => s + Number(t.baseImponible ?? 0), 0);
  return {
    ruc: String(it.ruc ?? ''),
    razonSocial: String(it.razonSocial ?? '').toUpperCase(),
    direccion: String(info.dirEstablecimiento ?? it.dirMatriz ?? '').toUpperCase() || null,
    codDoc: String(it.codDoc ?? '01'),
    numero: `${it.estab}${it.ptoEmi}${it.secuencial}`,
    fecha: `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
    comprador: String(info.identificacionComprador ?? info.identificacionProveedor ?? ''),
    baseRenta: r2(baseRenta),
    ivaValor: r2(ivaValor),
  };
}

