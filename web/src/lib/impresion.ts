import 'server-only';
import { sql } from './db';
import type { ModeloRide } from './sri/ride';

export type FormatoImpresion = 'a4' | 'ticket80' | 'ticket58';
export type AlEmitir = 'preguntar' | 'siempre' | 'nunca';
export type ConfigImpresion = { formato: FormatoImpresion; alEmitir: AlEmitir };

/** Sin configuracion guardada: ticket de 80 mm y preguntar (el sistema anterior imprimia ticket al finalizar) */
export const IMPRESION_POR_DEFECTO: ConfigImpresion = { formato: 'ticket80', alEmitir: 'preguntar' };

export const FORMATOS: Record<FormatoImpresion, string> = {
  a4: 'Hoja A4 (RIDE en PDF)',
  ticket80: 'Ticket 80 mm (impresora térmica)',
  ticket58: 'Ticket 58 mm (impresora térmica angosta)',
};
export const ACCIONES: Record<AlEmitir, string> = {
  preguntar: 'Preguntar «¿Desea imprimir?»',
  siempre: 'Imprimir siempre, sin preguntar',
  nunca: 'No imprimir (se imprime con el botón cuando se necesite)',
};

export async function configImpresion(emisorId: number): Promise<ConfigImpresion> {
  try {
    const [c] = await sql<{ formato: FormatoImpresion; al_emitir: AlEmitir }[]>`
      select formato, al_emitir from impresion_emisor where id_emisor = ${emisorId}`;
    return c ? { formato: c.formato, alEmitir: c.al_emitir } : IMPRESION_POR_DEFECTO;
  } catch {
    // tabla aun no creada (0014_impresion_emisor.sql): comportamiento por defecto
    return IMPRESION_POR_DEFECTO;
  }
}

function esc(s: string | null | undefined) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function col(cols: ModeloRide['tablas'][number]['columnas'], ...nombres: string[]) {
  return cols.findIndex((c) => nombres.some((n) => c.titulo.toLowerCase().startsWith(n.toLowerCase())));
}

/** Solo ASCII: las impresoras de matriz (TM-U220) con el controlador «Solo texto» no imprimen tildes ni ñ */
function ascii(s: string | null | undefined) {
  return String(s ?? '')
    .replace(/[º°]/g, 'o')
    .replace(/ª/g, 'a')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\r\t]/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

/** Corta un texto en lineas de n caracteres (por palabras) */
function cortar(texto: string, n: number): string[] {
  const out: string[] = [];
  for (const parrafo of ascii(texto).split('\n')) {
    let actual = '';
    for (const pal of parrafo.split(' ').filter(Boolean)) {
      let p = pal;
      while (p.length > n) {
        if (actual) { out.push(actual); actual = ''; }
        out.push(p.slice(0, n));
        p = p.slice(n);
      }
      if (!actual) actual = p;
      else if (actual.length + 1 + p.length <= n) actual += ' ' + p;
      else { out.push(actual); actual = p; }
    }
    out.push(actual);
  }
  return out;
}

const centro = (t: string, n: number) => cortar(t, n).map((l) => ' '.repeat(Math.max(0, Math.floor((n - l.length) / 2))) + l);

/** Texto a la izquierda y valor a la derecha en la misma linea (si no cabe, el valor va en la siguiente) */
function izqDer(izq: string, der: string, n: number): string[] {
  const d = ascii(der);
  const sangria = /^ */.exec(izq)![0];
  const lineas = cortar(izq, n - sangria.length).map((l) => sangria + l);
  const ult = lineas[lineas.length - 1];
  if (ult.length + 1 + d.length <= n) lineas[lineas.length - 1] = ult + ' '.repeat(n - ult.length - d.length) + d;
  else lineas.push(' '.repeat(Math.max(0, n - d.length)) + d);
  return lineas;
}

/** «Etiqueta: valor» con sangria en las lineas siguientes */
function campo(k: string, v: string, n: number): string[] {
  if (!v) return [];
  const [p, ...r] = cortar(`${k}: ${v}`, n);
  return [p, ...r.flatMap((l) => cortar(l, n - 2).map((x) => '  ' + x))];
}

function lineasTabla(t: ModeloRide['tablas'][number], n: number): string[] {
  const c = t.columnas;
  const iDesc = col(c, 'Descripción');
  const iCant = col(c, 'Cant');
  const iPU = col(c, 'Precio Unitario');
  const iDto = col(c, 'Descuento');
  const iTot = col(c, 'Precio Total');
  const iAd = col(c, 'Detalle Adicional');
  const iCod = col(c, 'Cod', 'Código');
  const out: string[] = t.titulo ? cortar(t.titulo, n) : [];
  if (iDesc >= 0 && iCant >= 0 && iTot >= 0) {
    for (const f of t.filas) {
      out.push(...cortar(`${iCod >= 0 && f[iCod] ? f[iCod] + ' ' : ''}${f[iDesc]}`, n));
      if (iAd >= 0 && f[iAd]) out.push(...cortar(f[iAd], n - 2).map((l) => '  ' + l));
      out.push(...izqDer(`  ${f[iCant]}${iPU >= 0 ? ` x ${f[iPU]}` : ''}`, f[iTot], n));
      if (iDto >= 0 && f[iDto] && Number(f[iDto].replace(',', '.')) > 0) out.push(...izqDer('  Descuento', `-${f[iDto]}`, n));
    }
    return out;
  }
  if (iDesc >= 0 && iCant >= 0) {
    for (const f of t.filas) out.push(...cortar(`${f[iCant]}  ${f[iDesc]}`, n));
    return out;
  }
  for (const f of t.filas) {
    c.forEach((x, i) => out.push(...campo(x.titulo, f[i], n)));
    out.push('');
  }
  return out;
}

/** Totales: se omiten los que estan en cero, salvo subtotal sin impuestos, IVA y total */
function lineasTotales(totales: [string, string][], n: number): string[] {
  const vis = totales.filter(([k, v]) => {
    const x = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
    return x !== 0 || (/^(SUBTOTAL SIN IMPUESTOS|IVA|VALOR TOTAL|TOTAL)/i.test(k) && !/DESCUENTO/i.test(k));
  });
  const out: string[] = [];
  vis.forEach(([k, v], i) => {
    if (i === vis.length - 1) out.push(' '.repeat(Math.max(0, n - 14)) + '='.repeat(Math.min(14, n)));
    out.push(...izqDer(k, v, n));
  });
  return out;
}

/** Ticket en texto de ancho fijo (columnas) */
export function ticketTexto(m: ModeloRide, n: number, tributario: boolean): string {
  const e = m.emisor;
  const sep = '-'.repeat(n);
  const fa = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(String(m.fechaAutorizacion ?? ''));
  const L: string[] = [];
  L.push(...centro(e.nombreComercial || e.razonSocial, n));
  if (e.nombreComercial && e.nombreComercial !== e.razonSocial) L.push(...centro(e.razonSocial, n));
  L.push(...centro(`RUC: ${e.ruc}`, n), ...centro(e.dirEstablecimiento || e.dirMatriz, n));
  if (tributario) {
    if (e.contribuyenteEspecial) L.push(...centro(`Contribuyente especial: ${e.contribuyenteEspecial}`, n));
    L.push(...centro(`Obligado a llevar contabilidad: ${e.obligadoContabilidad ? 'SI' : 'NO'}`, n));
  }
  L.push('', ...centro(m.titulo, n), ...centro(`No. ${m.numero}`, n), sep);
  if (tributario) {
    L.push(...cortar(`Ambiente: ${m.ambiente}  Emision: NORMAL`, n));
    L.push(...(fa ? cortar(`Autorizacion: ${fa[3]}/${fa[2]}/${fa[1]} ${fa[4]}`, n) : ['PENDIENTE DE AUTORIZACION DEL SRI']));
    L.push('Clave de acceso / No. autorizacion:', ...cortar(m.numeroAutorizacion || m.claveAcceso, n), sep);
  } else {
    L.push(...centro('Documento sin valor tributario', n), sep);
  }
  for (const [k, v] of m.receptor) L.push(...campo(/^Raz[oó]n Social/i.test(k) ? 'Cliente' : k, v, n));
  L.push(sep);
  m.tablas.forEach((t, i) => L.push(...(i ? [sep] : []), ...lineasTabla(t, n)));
  L.push(sep, ...lineasTotales(m.totales, n));
  if (m.pagos?.length) {
    L.push(sep, 'FORMA DE PAGO');
    for (const [k, v] of m.pagos) L.push(...izqDer(k, v, n));
  }
  if (m.adicionales.length) {
    L.push(sep);
    for (const [k, v] of m.adicionales) L.push(...campo(k, v, n));
  }
  if (m.pie) L.push(sep, ...centro(m.pie, n));
  if (m.lineaFirma) L.push('', '', '', ...centro('______________________', n), ...centro('Firma', n));
  L.push('', '', '');
  return L.map((l) => l.replace(/\s+$/, '')).join('\n');
}

/**
 * Ticket para impresora de rollo (80 o 58 mm), armado desde el mismo modelo del RIDE.
 * Es texto de ancho fijo (como el sistema anterior): sale bien tanto en impresoras termicas (TM-T20)
 * como en las de matriz (TM-U220) instaladas con el controlador «Generic / Text Only».
 * auto: imprime al cargar (pagina abierta sola); en un iframe la impresion la lanza la pagina que lo contiene.
 */
export function ticketHtml(m: ModeloRide, ancho: 80 | 58, opc: { auto: boolean; tributario: boolean }) {
  const n = ancho === 80 ? 40 : 32; // caracteres por linea (TM-U220 / TM-T20: 40 en 76-80 mm; 32 en 58 mm)
  const anchoPapel = ancho === 80 ? 72 : 48; // mm imprimibles aprox.
  const tam = ((anchoPapel / 25.4) * 96) / (n * 0.6); // px para que n caracteres de Courier quepan en el ancho
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(m.titulo)} ${esc(m.numero)}</title>
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  pre { margin: 0; padding: 0 0 0 1mm; font-family: 'Courier New', Courier, monospace; font-size: ${tam.toFixed(1)}px; line-height: 1.2; color: #000; white-space: pre; }
  @media screen { body { padding: 12px; } pre { display: inline-block; box-shadow: 0 0 0 1px #ccc; padding: 8px; } }
</style></head>
<body><pre>${esc(ticketTexto(m, n, opc.tributario))}</pre>
  ${opc.auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},150)});window.addEventListener("afterprint",function(){window.close()});</script>' : ''}
</body></html>`;
}
