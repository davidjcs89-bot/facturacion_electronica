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

/** Si el SRI devolvió un SOAP Fault (error interno de su servidor), lanza un error con su texto */
function revisarFalla(j: any, servicio: string) {
  const f = j?.Envelope?.Body?.Fault;
  if (!f) return;
  const texto = String(f.faultstring ?? f.Reason?.Text ?? 'sin detalle').slice(0, 300);
  throw new Error(`El servicio de ${servicio} del SRI tuvo un error interno y no procesó el comprobante (${texto}). ` +
    'No es un error de su comprobante: vuelva a intentar más tarde.');
}

/** Primeros caracteres de una respuesta que no se pudo interpretar (para el mensaje de error) */
function muestra(txt: string) {
  return txt.replace(/\s+/g, ' ').slice(0, 200);
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

export type RespuestaRecepcion = {
  estado: 'RECIBIDA' | 'DEVUELTA' | string;
  mensajes: Mensaje[];
  /** Codigo 43: el SRI ya tiene esta clave de acceso (fue recibida antes) */
  yaRegistrada: boolean;
  /** Codigo 70: el SRI aun esta procesando un envio anterior de esta clave; no reenviar, solo consultar */
  enProceso: boolean;
};

export async function enviarComprobante(ambiente: Ambiente, xmlFirmado: string): Promise<RespuestaRecepcion> {
  const b64 = Buffer.from(xmlFirmado, 'utf8').toString('base64');
  const cuerpo =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">` +
    `<soapenv:Header/><soapenv:Body><ec:validarComprobante><xml>${b64}</xml></ec:validarComprobante></soapenv:Body></soapenv:Envelope>`;
  const txt = await soap(URLS[ambiente].recepcion, cuerpo);
  const j = parser.parse(txt);
  revisarFalla(j, 'recepción');
  const resp = j?.Envelope?.Body?.validarComprobanteResponse?.RespuestaRecepcionComprobante;
  if (!resp) throw new Error(`Respuesta de recepción del SRI no reconocida: ${muestra(txt)}`);
  const mensajes: Mensaje[] = [];
  for (const comp of lista(resp.comprobantes?.comprobante)) {
    for (const m of lista((comp as { mensajes?: { mensaje?: Mensaje | Mensaje[] } }).mensajes?.mensaje)) mensajes.push(m);
  }
  // Ficha tecnica SRI, tabla de errores:
  //  43 "CLAVE ACCESO REGISTRADA" -> ya fue enviado antes; se consulta la autorizacion.
  //  70 "CLAVE DE ACCESO EN PROCESAMIENTO" -> no reenviar ni cambiar clave/secuencial; esperar la respuesta (max. 24 h).
  // (El 45 "SECUENCIAL REGISTRADO" NO entra aqui: puede ser otro comprobante con el mismo numero.)
  const codigo = (m: Mensaje) => String(m.identificador ?? '').trim();
  const yaRegistrada = mensajes.some((m) => codigo(m) === '43' || /CLAVE\s+(DE\s+)?ACCESO\s+REGISTRADA/i.test(m.mensaje ?? ''));
  const enProceso = mensajes.some((m) => codigo(m) === '70' || /EN\s+PROCESAMIENTO/i.test(m.mensaje ?? ''));
  return { estado: String(resp.estado ?? ''), mensajes, yaRegistrada, enProceso };
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
  revisarFalla(j, 'autorización');
  const resp = j?.Envelope?.Body?.autorizacionComprobanteResponse?.RespuestaAutorizacionComprobante;
  if (!resp) throw new Error(`Respuesta de autorización del SRI no reconocida: ${muestra(txt)}`);
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
