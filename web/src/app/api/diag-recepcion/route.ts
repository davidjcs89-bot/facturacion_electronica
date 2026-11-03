import { NextResponse } from 'next/server';
import forge from 'node-forge';
import { el, t } from '@/lib/sri/xml';
import { generarClaveAcceso } from '@/lib/sri/clave';
import { firmarComprobante, type Certificado } from '@/lib/sri/firma';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** TEMPORAL: prueba el envio al SRI (ambiente de pruebas) con datos ficticios y un certificado autofirmado. */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('k') !== 'de61387306210f7813675aa5') return new NextResponse('no', { status: 401 });
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  const attrs = [{ name: 'commonName', value: 'PRUEBA' }, { name: 'countryName', value: 'EC' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const c: Certificado = {
    privateKey: keys.privateKey, cert, certDer: forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
    titular: 'PRUEBA', validoDesde: cert.validity.notBefore, validoHasta: cert.validity.notAfter,
  };
  const ruc = '1790011674001';
  const numero = '001-001-' + String(Math.floor(Math.random() * 1e8)).padStart(9, '0');
  const clave = generarClaveAcceso({ fecha: new Date(Date.now() - 5 * 3600e3), codDoc: '01', ruc, ambiente: '1', numero });
  const [es, pe, sec] = numero.split('-');
  const xml = el('factura', { id: 'comprobante', version: '1.1.0' },
    el('infoTributaria', null, t('ambiente', '1'), t('tipoEmision', '1'), t('razonSocial', 'PRUEBA'), t('ruc', ruc), t('claveAcceso', clave),
      t('codDoc', '01'), t('estab', es), t('ptoEmi', pe), t('secuencial', sec), t('dirMatriz', 'QUITO')),
    el('infoFactura', null, t('fechaEmision', clave.slice(0, 2) + '/' + clave.slice(2, 4) + '/' + clave.slice(4, 8)), t('obligadoContabilidad', 'NO'),
      t('tipoIdentificacionComprador', '07'), t('razonSocialComprador', 'CONSUMIDOR FINAL'), t('identificacionComprador', '9999999999999'),
      t('totalSinImpuestos', '1.00'), t('totalDescuento', '0.00'),
      el('totalConImpuestos', null, el('totalImpuesto', null, t('codigo', '2'), t('codigoPorcentaje', '4'), t('baseImponible', '1.00'), t('valor', '0.15'))),
      t('propina', '0.00'), t('importeTotal', '1.15'), t('moneda', 'USD'),
      el('pagos', null, el('pago', null, t('formaPago', '01'), t('total', '1.15')))),
    el('detalles', null, el('detalle', null, t('codigoPrincipal', 'P1'), t('descripcion', 'PRUEBA'), t('cantidad', '1'), t('precioUnitario', '1.000'),
      t('descuento', '0.00'), t('precioTotalSinImpuesto', '1.00'),
      el('impuestos', null, el('impuesto', null, t('codigo', '2'), t('codigoPorcentaje', '4'), t('tarifa', '15.00'), t('baseImponible', '1.00'), t('valor', '0.15'))))));
  const firmado = firmarComprobante(xml, c);
  const b64 = Buffer.from(firmado, 'utf8').toString('base64');
  const cuerpo =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">` +
    `<soapenv:Header/><soapenv:Body><ec:validarComprobante><xml>${b64}</xml></ec:validarComprobante></soapenv:Body></soapenv:Envelope>`;
  const r = await fetch('https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline', {
    method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' }, body: cuerpo, cache: 'no-store',
  });
  const txt = await r.text();
  return NextResponse.json({ status: r.status, tipo: r.headers.get('content-type'), largo: txt.length, inicio: txt.slice(0, 3000) });
}
