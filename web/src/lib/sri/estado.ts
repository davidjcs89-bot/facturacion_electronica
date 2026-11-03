import 'server-only';
import forge from 'node-forge';
import { el, t } from './xml';
import { generarClaveAcceso } from './clave';
import { firmarComprobante, type Certificado } from './firma';
import { enviarComprobante, consultarAutorizacion, textoMensajes, type Ambiente } from './ws';

/**
 * Revisa si los servicios del SRI estan funcionando, sin tocar comprobantes reales.
 *  - Recepcion y autorizacion: que respondan (descarga del WSDL).
 *  - Autorizacion: consulta de una clave inexistente (solo lectura).
 *  - Solo en PRUEBAS: envia una factura de ensayo firmada con un certificado temporal, con establecimiento y
 *    punto 999-999 y secuencial al azar (no choca con la numeracion real). Si el SRI la recibe o la devuelve
 *    con un motivo, la recepcion funciona; si responde con error interno, el SRI esta fallando.
 *    En PRODUCCION nunca se envia nada.
 */
export type Revision = { servicio: string; ok: boolean; detalle: string };

const URL_BASE: Record<Ambiente, string> = {
  '1': 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws',
  '2': 'https://cel.sri.gob.ec/comprobantes-electronicos-ws',
};

async function responde(url: string): Promise<Revision['detalle'] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    const txt = await r.text();
    if (r.ok && txt.includes('definitions')) return null;
    return `respondió HTTP ${r.status}`;
  } catch (e) {
    return (e as Error).name === 'AbortError' ? 'no respondió a tiempo' : `sin conexión (${(e as Error).message})`;
  } finally {
    clearTimeout(timer);
  }
}

function certificadoTemporal(): Certificado {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  const attrs = [{ name: 'commonName', value: 'PRUEBA DE CONEXION' }, { name: 'countryName', value: 'EC' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    privateKey: keys.privateKey,
    cert,
    certDer: forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
    titular: 'PRUEBA DE CONEXION',
    validoDesde: cert.validity.notBefore,
    validoHasta: cert.validity.notAfter,
  };
}

function facturaDeEnsayo(ruc: string) {
  const numero = '999-999-' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  const ahoraEc = new Date(Date.now() - 5 * 3600e3);
  const fechaClave = new Date(ahoraEc.getUTCFullYear(), ahoraEc.getUTCMonth(), ahoraEc.getUTCDate());
  const clave = generarClaveAcceso({ fecha: fechaClave, codDoc: '01', ruc, ambiente: '1', numero });
  const [es, pe, sec] = numero.split('-');
  const xml = el('factura', { id: 'comprobante', version: '1.1.0' },
    el('infoTributaria', null, t('ambiente', '1'), t('tipoEmision', '1'), t('razonSocial', 'PRUEBA DE CONEXION'), t('ruc', ruc),
      t('claveAcceso', clave), t('codDoc', '01'), t('estab', es), t('ptoEmi', pe), t('secuencial', sec), t('dirMatriz', 'PRUEBA')),
    el('infoFactura', null, t('fechaEmision', `${clave.slice(0, 2)}/${clave.slice(2, 4)}/${clave.slice(4, 8)}`), t('obligadoContabilidad', 'NO'),
      t('tipoIdentificacionComprador', '07'), t('razonSocialComprador', 'CONSUMIDOR FINAL'), t('identificacionComprador', '9999999999999'),
      t('totalSinImpuestos', '1.00'), t('totalDescuento', '0.00'),
      el('totalConImpuestos', null, el('totalImpuesto', null, t('codigo', '2'), t('codigoPorcentaje', '4'), t('baseImponible', '1.00'), t('valor', '0.15'))),
      t('propina', '0.00'), t('importeTotal', '1.15'), t('moneda', 'USD'),
      el('pagos', null, el('pago', null, t('formaPago', '01'), t('total', '1.15')))),
    el('detalles', null, el('detalle', null, t('codigoPrincipal', 'PRUEBA'), t('descripcion', 'PRUEBA DE CONEXION'), t('cantidad', '1'),
      t('precioUnitario', '1.000'), t('descuento', '0.00'), t('precioTotalSinImpuesto', '1.00'),
      el('impuestos', null, el('impuesto', null, t('codigo', '2'), t('codigoPorcentaje', '4'), t('tarifa', '15.00'), t('baseImponible', '1.00'), t('valor', '0.15'))))),
    el('infoAdicional', null, el('campoAdicional', { nombre: 'Nota' }, 'PRUEBA DE CONEXION, NO ES UNA VENTA')));
  return { clave, xml };
}

export async function revisarSri(ambiente: Ambiente, ruc: string): Promise<Revision[]> {
  const base = URL_BASE[ambiente];
  const [rec, aut] = await Promise.all([
    responde(`${base}/RecepcionComprobantesOffline?wsdl`),
    responde(`${base}/AutorizacionComprobantesOffline?wsdl`),
  ]);
  const out: Revision[] = [
    { servicio: 'Recepción: conexión', ok: !rec, detalle: rec ?? 'responde' },
    { servicio: 'Autorización: conexión', ok: !aut, detalle: aut ?? 'responde' },
  ];

  if (!aut) {
    try {
      // Clave de acceso con formato valido que no existe: el SRI debe contestar con 0 comprobantes
      const clave = generarClaveAcceso({ fecha: new Date(2020, 0, 1), codDoc: '01', ruc, ambiente, numero: '999-999-000000001', codigoNumerico: '00000000' });
      const r = await consultarAutorizacion(ambiente, clave);
      out.push({ servicio: 'Autorización: consulta', ok: true, detalle: `contesta normalmente (${r.estado || 'sin datos'})` });
    } catch (e) {
      out.push({ servicio: 'Autorización: consulta', ok: false, detalle: (e as Error).message });
    }
  }

  if (ambiente === '1' && !rec) {
    try {
      const { xml } = facturaDeEnsayo(ruc);
      const r = await enviarComprobante('1', firmarComprobante(xml, certificadoTemporal()));
      out.push({
        servicio: 'Recepción: envío de ensayo',
        ok: true,
        detalle: r.estado === 'RECIBIDA' ? 'recibió la factura de ensayo' : `contesta normalmente (${r.estado}: ${textoMensajes(r.mensajes).slice(0, 150)})`,
      });
    } catch (e) {
      out.push({ servicio: 'Recepción: envío de ensayo', ok: false, detalle: (e as Error).message });
    }
  } else if (ambiente === '2') {
    out.push({ servicio: 'Recepción: envío de ensayo', ok: true, detalle: 'no se hace en producción (solo se revisa la conexión)' });
  }
  return out;
}
