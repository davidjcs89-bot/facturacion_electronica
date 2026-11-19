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

/** Detalle de una tabla del RIDE en formato angosto */
function tablaTicket(t: ModeloRide['tablas'][number]) {
  const c = t.columnas;
  const iDesc = col(c, 'Descripción');
  const iCant = col(c, 'Cant');
  const iPU = col(c, 'Precio Unitario');
  const iDto = col(c, 'Descuento');
  const iTot = col(c, 'Precio Total');
  const iAd = col(c, 'Detalle Adicional');
  const iCod = col(c, 'Cod', 'Código');
  let h = t.titulo ? `<div class="sub">${esc(t.titulo)}</div>` : '';
  if (iDesc >= 0 && iCant >= 0 && iTot >= 0) {
    // lineas de productos: descripcion y debajo cantidad x precio = total
    h += '<table class="det">';
    for (const f of t.filas) {
      const dto = iDto >= 0 && f[iDto] && Number(f[iDto].replace(/,/g, '')) > 0 ? ` <span class="peq">desc. ${esc(f[iDto])}</span>` : '';
      h += `<tr><td colspan="2" class="desc">${iCod >= 0 && f[iCod] ? `<span class="peq">${esc(f[iCod])}</span> ` : ''}${esc(f[iDesc])}${
        iAd >= 0 && f[iAd] ? `<br><span class="peq">${esc(f[iAd])}</span>` : ''
      }</td></tr>`;
      h += `<tr><td>${esc(f[iCant])}${iPU >= 0 ? ` x ${esc(f[iPU])}` : ''}${dto}</td><td class="der">${esc(f[iTot])}</td></tr>`;
    }
    return h + '</table>';
  }
  if (iDesc >= 0 && iCant >= 0) {
    // guia de remision: cantidad y descripcion
    h += '<table class="det">';
    for (const f of t.filas) h += `<tr><td class="cant">${esc(f[iCant])}</td><td>${esc(f[iDesc])}</td></tr>`;
    return h + '</table>';
  }
  // generico (retenciones, notas de debito, destinatarios): titulo: valor
  for (const f of t.filas) {
    h += '<table class="kv">';
    c.forEach((x, i) => {
      if (f[i]) h += `<tr><td>${esc(x.titulo)}</td><td class="der">${esc(f[i])}</td></tr>`;
    });
    h += '</table><div class="sep"></div>';
  }
  return h;
}

/** Totales: se omiten los que estan en cero, salvo subtotal, IVA y total */
function totalesTicket(totales: [string, string][]) {
  const vis = totales.filter(([k, v]) => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return n !== 0 || /^(SUBTOTAL SIN IMPUESTOS|IVA|VALOR TOTAL|TOTAL)/i.test(k);
  });
  return `<table class="kv tot">${vis
    .map(([k, v], i) => `<tr${i === vis.length - 1 ? ' class="grande"' : ''}><td>${esc(k)}</td><td class="der">${esc(v)}</td></tr>`)
    .join('')}</table>`;
}

/**
 * Ticket en HTML para impresora termica (80 o 58 mm), armado desde el mismo modelo del RIDE.
 * auto: imprime al cargar (pagina abierta sola); en un iframe la impresion la lanza la pagina que lo contiene.
 */
export function ticketHtml(m: ModeloRide, ancho: 80 | 58, opc: { auto: boolean; tributario: boolean }) {
  const anchoPapel = ancho === 80 ? 72 : 48; // area imprimible en mm
  const tam = ancho === 80 ? 11 : 9.5;
  const e = m.emisor;
  const logo = e.logo ? `<img class="logo" src="data:${esc(e.logo.mime)};base64,${Buffer.from(e.logo.bytes).toString('base64')}" alt="">` : '';
  const pares = (l: [string, string][]) =>
    l.filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
  const fa = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(String(m.fechaAutorizacion ?? ''));
  const fechaAut = fa ? `${fa[3]}/${fa[2]}/${fa[1]} ${fa[4]}` : '';
  const receptor = m.receptor.map(([k, v]) => [/^Raz[oó]n Social/i.test(k) ? 'Cliente' : k, v] as [string, string]);
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(m.titulo)} ${esc(m.numero)}</title>
<style>
  @page { size: ${ancho}mm auto; margin: 2mm ${(ancho - anchoPapel) / 2}mm; }
  * { box-sizing: border-box; }
  body { margin: 0; width: ${anchoPapel}mm; font-family: Arial, Helvetica, sans-serif; font-size: ${tam}px; color: #000; line-height: 1.25; }
  .centro { text-align: center; }
  .der { text-align: right; white-space: nowrap; }
  .logo { display: block; margin: 0 auto 4px; max-width: 70%; max-height: 22mm; }
  .nombre { font-weight: bold; font-size: 1.25em; }
  .doc { font-weight: bold; font-size: 1.15em; margin-top: 4px; }
  .peq { font-size: 0.85em; }
  .clave { font-family: 'Courier New', monospace; font-size: 0.8em; word-break: break-all; }
  .sep { border-top: 1px dashed #000; margin: 5px 0; }
  .sub { font-weight: bold; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .kv td:first-child { padding-right: 4px; }
  .det .desc { padding-top: 3px; }
  .det .cant { width: 12mm; }
  .tot .grande td { font-weight: bold; font-size: 1.2em; padding-top: 3px; }
  .firma { margin-top: 14mm; border-top: 1px solid #000; text-align: center; padding-top: 2px; }
  @media screen { body { margin: 10px auto; padding: 6px; box-shadow: 0 0 0 1px #ccc; } }
</style></head>
<body>
  <div class="centro">
    ${logo}
    <div class="nombre">${esc(e.nombreComercial || e.razonSocial)}</div>
    ${e.nombreComercial && e.nombreComercial !== e.razonSocial ? `<div>${esc(e.razonSocial)}</div>` : ''}
    <div>RUC: ${esc(e.ruc)}</div>
    <div class="peq">${esc(e.dirEstablecimiento || e.dirMatriz)}</div>
    ${opc.tributario && e.contribuyenteEspecial ? `<div class="peq">Contribuyente especial: ${esc(e.contribuyenteEspecial)}</div>` : ''}
    ${opc.tributario ? `<div class="peq">Obligado a llevar contabilidad: ${e.obligadoContabilidad ? 'SÍ' : 'NO'}</div>` : ''}
    <div class="doc">${esc(m.titulo)}</div>
    <div class="doc">N.º ${esc(m.numero)}</div>
  </div>
  ${
    opc.tributario
      ? `<div class="sep"></div>
  <div>Ambiente: ${esc(m.ambiente)} · Emisión: NORMAL</div>
  ${fechaAut ? `<div>Autorización: ${fechaAut}</div>` : '<div><strong>Pendiente de autorización del SRI</strong></div>'}
  <div>Clave de acceso / N.º de autorización:</div>
  <div class="clave">${esc(m.numeroAutorizacion || m.claveAcceso)}</div>`
      : '<div class="centro peq">Documento sin valor tributario</div>'
  }
  <div class="sep"></div>
  <table class="kv">${pares(receptor)}</table>
  <div class="sep"></div>
  ${m.tablas.map(tablaTicket).join('<div class="sep"></div>')}
  <div class="sep"></div>
  ${totalesTicket(m.totales)}
  ${m.pagos?.length ? `<div class="sep"></div><div class="sub">Forma de pago</div><table class="kv">${pares(m.pagos)}</table>` : ''}
  ${m.adicionales.length ? `<div class="sep"></div><table class="kv peq">${pares(m.adicionales)}</table>` : ''}
  ${m.pie ? `<div class="sep"></div><div class="centro">${esc(m.pie).replace(/\n/g, '<br>')}</div>` : ''}
  ${m.lineaFirma ? '<div class="firma">Firma</div>' : ''}
  <div style="height:6mm"></div>
  ${opc.auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},150)});window.addEventListener("afterprint",function(){window.close()});</script>' : ''}
</body></html>`;
}
