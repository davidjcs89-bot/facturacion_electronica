import { XMLParser } from 'fast-xml-parser';

/** Servicios web offline del SRI (recepcion y autorizacion de comprobantes). */

const URLS = {
  '1': {
    recepcion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
    autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
  },
  '2': {
    recepcion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
    autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
  },
} as const;

export type Ambiente = '1' | '2';

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });

type Mensaje = { identificador?: string; mensaje?: string; informacionAdicional?: string; tipo?: string };

function lista<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

export function textoMensajes(m: Mensaje[]): string {
  return m
    .map((x) => [x.identificador && `[${x.identificador}]`, x.mensaje, x.informacionAdicional].filter(Boolean).join(' '))
    .join('\n');
}

async function soap(url: string, cuerpo: string, timeoutMs = 25000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body: cuerpo,
      signal: ctrl.signal,
      cache: 'no-store',
    });
    const txt = await r.text();
    if (!r.ok && !txt.includes('Envelope')) throw new Error(`El SRI respondió HTTP ${r.status}`);
    return txt;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('El SRI no respondió a tiempo');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export type RespuestaRecepcion = { estado: 'RECIBIDA' | 'DEVUELTA' | string; mensajes: Mensaje[]; yaRegistrada: boolean };

export async function enviarComprobante(ambiente: Ambiente, xmlFirmado: string): Promise<RespuestaRecepcion> {
  const b64 = Buffer.from(xmlFirmado, 'utf8').toString('base64');
  const cuerpo =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">` +
    `<soapenv:Header/><soapenv:Body><ec:validarComprobante><xml>${b64}</xml></ec:validarComprobante></soapenv:Body></soapenv:Envelope>`;
  const txt = await soap(URLS[ambiente].recepcion, cuerpo);
  const j = parser.parse(txt);
  const resp = j?.Envelope?.Body?.validarComprobanteResponse?.RespuestaRecepcionComprobante;
  if (!resp) throw new Error('Respuesta de recepción del SRI no reconocida');
  const mensajes: Mensaje[] = [];
  for (const comp of lista(resp.comprobantes?.comprobante)) {
    for (const m of lista((comp as { mensajes?: { mensaje?: Mensaje | Mensaje[] } }).mensajes?.mensaje)) mensajes.push(m);
  }
  // Codigo 43: "CLAVE ACCESO REGISTRADA" -> ya fue enviado antes; se puede consultar la autorizacion
  const yaRegistrada = mensajes.some((m) => String(m.identificador) === '43' || /REGISTRAD/i.test(m.mensaje ?? ''));
  return { estado: String(resp.estado ?? ''), mensajes, yaRegistrada };
}

export type RespuestaAutorizacion = {
  estado: 'AUTORIZADO' | 'NO AUTORIZADO' | 'EN PROCESO' | 'SIN RESPUESTA' | string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente?: string;
  comprobante?: string; // XML firmado tal como lo autorizo el SRI
  mensajes: Mensaje[];
  xmlAutorizacion?: string; // XML de autorizacion completo (formato estandar para el cliente)
};

export async function consultarAutorizacion(ambiente: Ambiente, claveAcceso: string): Promise<RespuestaAutorizacion> {
  const cuerpo =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">` +
    `<soapenv:Header/><soapenv:Body><ec:autorizacionComprobante><claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>` +
    `</ec:autorizacionComprobante></soapenv:Body></soapenv:Envelope>`;
  const txt = await soap(URLS[ambiente].autorizacion, cuerpo);
  const j = parser.parse(txt);
  const resp = j?.Envelope?.Body?.autorizacionComprobanteResponse?.RespuestaAutorizacionComprobante;
  if (!resp) throw new Error('Respuesta de autorización del SRI no reconocida');
  const auts = lista(resp.autorizaciones?.autorizacion) as Record<string, unknown>[];
  if (!auts.length) return { estado: Number(resp.numeroComprobantes ?? 0) === 0 ? 'SIN RESPUESTA' : 'EN PROCESO', mensajes: [] };
  // Si hay varias, preferir la autorizada
  const a = auts.find((x) => x.estado === 'AUTORIZADO') ?? auts[0];
  const mensajes = lista((a.mensajes as { mensaje?: Mensaje | Mensaje[] } | undefined)?.mensaje);
  const comprobante = typeof a.comprobante === 'string' ? a.comprobante : undefined;
  const estado = String(a.estado ?? '');
  let xmlAutorizacion: string | undefined;
  if (estado === 'AUTORIZADO' && comprobante) {
    xmlAutorizacion =
      `<?xml version="1.0" encoding="UTF-8"?><autorizacion>` +
      `<estado>${estado}</estado>` +
      `<numeroAutorizacion>${a.numeroAutorizacion ?? ''}</numeroAutorizacion>` +
      `<fechaAutorizacion>${a.fechaAutorizacion ?? ''}</fechaAutorizacion>` +
      `<ambiente>${a.ambiente ?? ''}</ambiente>` +
      `<comprobante><![CDATA[${comprobante}]]></comprobante>` +
      `<mensajes/></autorizacion>`;
  }
  return {
    estado,
    numeroAutorizacion: a.numeroAutorizacion ? String(a.numeroAutorizacion) : undefined,
    fechaAutorizacion: a.fechaAutorizacion ? String(a.fechaAutorizacion) : undefined,
    ambiente: a.ambiente ? String(a.ambiente) : undefined,
    comprobante,
    mensajes,
    xmlAutorizacion,
  };
}
