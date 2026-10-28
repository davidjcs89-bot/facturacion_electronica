import forge from 'node-forge';
import { escAtributo, escTexto } from './xml';

/**
 * Firma XAdES-BES (enveloped) con RSA-SHA1, igual a la que genera la libreria MITyC usada por la app anterior
 * y que exige el SRI para comprobantes electronicos.
 */

const DS = 'http://www.w3.org/2000/09/xmldsig#';
const ETSI = 'http://uri.etsi.org/01903/v1.3.2#';
const NS = `xmlns:ds="${DS}" xmlns:etsi="${ETSI}"`;
const ALG_SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1';

export type Certificado = {
  privateKey: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  certDer: string; // binario
  titular: string;
  validoDesde: Date;
  validoHasta: Date;
};

function b64(bin: string, cortar = true) {
  const s = forge.util.encode64(bin);
  return cortar ? s.replace(/(.{76})/g, '$1\n').replace(/\n$/, '') : s;
}

function sha1b64(texto: string) {
  const md = forge.md.sha1.create();
  md.update(texto, 'utf8');
  return forge.util.encode64(md.digest().bytes());
}

function sha1b64Bin(bin: string) {
  const md = forge.md.sha1.create();
  md.update(bin, 'raw');
  return forge.util.encode64(md.digest().bytes());
}

function bigIntABin(n: forge.jsbn.BigInteger) {
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return forge.util.hexToBytes(hex);
}

function aleatorio() {
  return Math.floor(Math.random() * 999000) + 1000;
}

/** Lee el archivo .p12 y elige el certificado que corresponde a la llave privada (el de firma). */
export function leerCertificado(p12: Uint8Array | Buffer, clave: string): Certificado {
  let pkcs12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(new Uint8Array(p12)));
    pkcs12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, clave);
  } catch (e) {
    const msg = String((e as Error).message || e);
    if (/password|MAC|mac/i.test(msg)) throw new Error('La clave de la firma electrónica es incorrecta');
    throw new Error('No se pudo leer el archivo de firma (.p12): ' + msg);
  }
  const llaves: forge.pki.rsa.PrivateKey[] = [];
  for (const tipo of [forge.pki.oids.pkcs8ShroudedKeyBag, forge.pki.oids.keyBag]) {
    const bags = pkcs12.getBags({ bagType: tipo })[tipo] ?? [];
    for (const b of bags) if (b.key) llaves.push(b.key as forge.pki.rsa.PrivateKey);
  }
  const certs = (pkcs12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [])
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c);
  if (!llaves.length || !certs.length) throw new Error('El archivo de firma no contiene llave privada y certificado');

  for (const key of llaves) {
    const cert = certs.find((c) => {
      const pub = c.publicKey as forge.pki.rsa.PublicKey;
      return pub.n && pub.n.equals(key.n);
    });
    if (cert) {
      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
      const cn = cert.subject.getField('CN');
      return {
        privateKey: key,
        cert,
        certDer,
        titular: cn ? String(cn.value) : '',
        validoDesde: cert.validity.notBefore,
        validoHasta: cert.validity.notAfter,
      };
    }
  }
  throw new Error('No se encontró el certificado correspondiente a la llave privada');
}

function nombreEmisorCert(cert: forge.pki.Certificate) {
  return cert.issuer.attributes
    .slice()
    .reverse()
    .map((a) => `${a.shortName || a.name || a.type}=${a.value}`)
    .join(',');
}

function horaEcuadorISO(d = new Date()) {
  const loc = new Date(d.getTime() - 5 * 3600 * 1000);
  return loc.toISOString().slice(0, 19) + '-05:00';
}

/**
 * Firma el XML canonico del comprobante (elemento raiz con id="comprobante", sin declaracion XML).
 * Devuelve el documento firmado completo, con declaracion XML.
 */
export function firmarComprobante(xmlCanonico: string, c: Certificado, fechaFirma = new Date()): string {
  const xml = xmlCanonico.replace(/^<\?xml[^>]*\?>\s*/, '');
  const cierre = xml.lastIndexOf('</');
  if (cierre < 0) throw new Error('XML del comprobante inválido');

  const sigId = `Signature${aleatorio()}`;
  const signedInfoId = `Signature-SignedInfo${aleatorio()}`;
  const signedPropsId = `${sigId}-SignedProperties${aleatorio()}`;
  const signedPropsRefId = `SignedPropertiesID${aleatorio()}`;
  const certId = `Certificate${aleatorio()}`;
  const refId = `Reference-ID-${aleatorio()}`;
  const sigValueId = `SignatureValue${aleatorio()}`;
  const objectId = `${sigId}-Object${aleatorio()}`;

  const pub = c.cert.publicKey as forge.pki.rsa.PublicKey;
  const certB64 = b64(c.certDer);
  const modulo = b64(bigIntABin(pub.n));
  const exponente = b64(bigIntABin(pub.e), false);
  const certDigest = sha1b64Bin(c.certDer);
  const serial = BigInt('0x' + c.cert.serialNumber).toString(10);

  // 1. Digest del comprobante (transformacion enveloped: el XML sin la firma)
  const digestComprobante = sha1b64(xml);

  // 2. SignedProperties
  const signedPropsContenido =
    `<etsi:SignedSignatureProperties>` +
    `<etsi:SigningTime>${horaEcuadorISO(fechaFirma)}</etsi:SigningTime>` +
    `<etsi:SigningCertificate><etsi:Cert><etsi:CertDigest>` +
    `<ds:DigestMethod Algorithm="${ALG_SHA1}"></ds:DigestMethod>` +
    `<ds:DigestValue>${certDigest}</ds:DigestValue>` +
    `</etsi:CertDigest><etsi:IssuerSerial>` +
    `<ds:X509IssuerName>${escTexto(nombreEmisorCert(c.cert))}</ds:X509IssuerName>` +
    `<ds:X509SerialNumber>${serial}</ds:X509SerialNumber>` +
    `</etsi:IssuerSerial></etsi:Cert></etsi:SigningCertificate>` +
    `</etsi:SignedSignatureProperties>` +
    `<etsi:SignedDataObjectProperties>` +
    `<etsi:DataObjectFormat ObjectReference="#${escAtributo(refId)}">` +
    `<etsi:Description>contenido comprobante</etsi:Description>` +
    `<etsi:MimeType>text/xml</etsi:MimeType>` +
    `</etsi:DataObjectFormat></etsi:SignedDataObjectProperties>`;
  const signedProps = `<etsi:SignedProperties Id="${signedPropsId}">${signedPropsContenido}</etsi:SignedProperties>`;
  const digestSignedProps = sha1b64(`<etsi:SignedProperties ${NS} Id="${signedPropsId}">${signedPropsContenido}</etsi:SignedProperties>`);

  // 3. KeyInfo
  const keyInfoContenido =
    `<ds:X509Data><ds:X509Certificate>\n${certB64}\n</ds:X509Certificate></ds:X509Data>` +
    `<ds:KeyValue><ds:RSAKeyValue><ds:Modulus>\n${modulo}\n</ds:Modulus><ds:Exponent>${exponente}</ds:Exponent></ds:RSAKeyValue></ds:KeyValue>`;
  const keyInfo = `<ds:KeyInfo Id="${certId}">${keyInfoContenido}</ds:KeyInfo>`;
  const digestKeyInfo = sha1b64(`<ds:KeyInfo ${NS} Id="${certId}">${keyInfoContenido}</ds:KeyInfo>`);

  // 4. SignedInfo
  const signedInfoContenido =
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>` +
    `<ds:Reference Id="${signedPropsRefId}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropsId}">` +
    `<ds:DigestMethod Algorithm="${ALG_SHA1}"></ds:DigestMethod><ds:DigestValue>${digestSignedProps}</ds:DigestValue></ds:Reference>` +
    `<ds:Reference URI="#${certId}">` +
    `<ds:DigestMethod Algorithm="${ALG_SHA1}"></ds:DigestMethod><ds:DigestValue>${digestKeyInfo}</ds:DigestValue></ds:Reference>` +
    `<ds:Reference Id="${refId}" URI="#comprobante">` +
    `<ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform></ds:Transforms>` +
    `<ds:DigestMethod Algorithm="${ALG_SHA1}"></ds:DigestMethod><ds:DigestValue>${digestComprobante}</ds:DigestValue></ds:Reference>`;
  const signedInfo = `<ds:SignedInfo Id="${signedInfoId}">${signedInfoContenido}</ds:SignedInfo>`;
  const signedInfoCanonico = `<ds:SignedInfo ${NS} Id="${signedInfoId}">${signedInfoContenido}</ds:SignedInfo>`;

  // 5. Firma RSA-SHA1 del SignedInfo
  const md = forge.md.sha1.create();
  md.update(signedInfoCanonico, 'utf8');
  const valorFirma = b64(c.privateKey.sign(md));

  const firma =
    `<ds:Signature ${NS} Id="${sigId}">` +
    signedInfo +
    `<ds:SignatureValue Id="${sigValueId}">\n${valorFirma}\n</ds:SignatureValue>` +
    keyInfo +
    `<ds:Object Id="${objectId}"><etsi:QualifyingProperties Target="#${sigId}">${signedProps}</etsi:QualifyingProperties></ds:Object>` +
    `</ds:Signature>`;

  return `<?xml version="1.0" encoding="UTF-8"?>${xml.slice(0, cierre)}${firma}${xml.slice(cierre)}`;
}
