import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import { code128 } from './code128';

/** Modelo generico del RIDE (representacion impresa del documento electronico). */
export type ColumnaRide = { titulo: string; ancho: number; alin?: 'izq' | 'der' | 'centro' };
export type TablaRide = { titulo?: string; columnas: ColumnaRide[]; filas: string[][] };
export type ModeloRide = {
  titulo: string; // FACTURA, NOTA DE CRÉDITO, ...
  numero: string;
  claveAcceso: string;
  numeroAutorizacion?: string | null;
  fechaAutorizacion?: string | null;
  ambiente: string; // PRODUCCIÓN / PRUEBAS
  emisor: {
    ruc: string; razonSocial: string; nombreComercial?: string | null; dirMatriz: string; dirEstablecimiento?: string | null;
    contribuyenteEspecial?: string | null; obligadoContabilidad: boolean; logo?: { bytes: Uint8Array; mime: string } | null;
  };
  receptor: [string, string][];
  tablas: TablaRide[];
  adicionales: [string, string][];
  pagos?: [string, string][];
  totales: [string, string][];
  /** Opciones de impresion del emisor (Configuracion -> Impresion) */
  pie?: string | null;
  lineaFirma?: boolean;
};

const NEGRO = rgb(0, 0, 0);
const GRIS = rgb(0.35, 0.35, 0.35);
const BORDE = rgb(0.55, 0.55, 0.55);
const FONDO = rgb(0.93, 0.93, 0.93);

/** Deja solo caracteres representables en WinAnsi (fuentes estandar del PDF) */
function seguro(s: string | null | undefined) {
  if (!s) return '';
  return Array.from(String(s).replace(/[\r\t]/g, ' '))
    .map((ch) => {
      const c = ch.charCodeAt(0);
      if (ch === '\n') return '\n';
      if (c >= 32 && c <= 126) return ch;
      if (c >= 160 && c <= 255) return ch;
      const sin = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (sin && sin.charCodeAt(0) < 256) return sin;
      if (ch === '€' || ch === '“' || ch === '”' || ch === '‘' || ch === '’' || ch === '–' || ch === '—') return ch === '–' || ch === '—' ? '-' : '"';
      return '?';
    })
    .join('');
}

function formatoFechaAut(f: string | null | undefined) {
  if (!f) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/.exec(f);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}` : f;
}

function partir(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of seguro(texto).split('\n')) {
    const palabras = parrafo.split(' ');
    let actual = '';
    for (const p of palabras) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) {
        actual = prueba;
      } else {
        if (actual) lineas.push(actual);
        // palabra mas larga que el ancho: cortarla
        let resto = p;
        while (fuente.widthOfTextAtSize(resto, tam) > ancho && resto.length > 1) {
          let k = resto.length;
          while (k > 1 && fuente.widthOfTextAtSize(resto.slice(0, k), tam) > ancho) k--;
          lineas.push(resto.slice(0, k));
          resto = resto.slice(k);
        }
        actual = resto;
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

export async function generarRide(m: ModeloRide): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${m.titulo} ${m.numero}`);
  pdf.setProducer('Facturación Electrónica');
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ANCHO = 595.28;
  const ALTO = 841.89;
  const MARGEN = 28;
  const util = ANCHO - MARGEN * 2;
  let pagina: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  let logo: PDFImage | null = null;
  if (m.emisor.logo) {
    try {
      logo = m.emisor.logo.mime.includes('png') ? await pdf.embedPng(m.emisor.logo.bytes) : await pdf.embedJpg(m.emisor.logo.bytes);
    } catch {
      logo = null;
    }
  }

  const texto = (s: string, x: number, yy: number, tam = 8, negrita = false, color = NEGRO) =>
    pagina.drawText(seguro(s), { x, y: yy, size: tam, font: negrita ? fb : f, color });
  const caja = (x: number, yy: number, w: number, h: number, fondo = false) =>
    pagina.drawRectangle({ x, y: yy, width: w, height: h, borderColor: BORDE, borderWidth: 0.7, color: fondo ? FONDO : undefined });

  const nuevaPagina = () => {
    pagina = pdf.addPage([ANCHO, ALTO]);
    y = ALTO - MARGEN;
  };

  // ---------------- Encabezado ----------------
  const colIzq = util * 0.5 - 4;
  const xDer = MARGEN + util * 0.5 + 4;
  const colDer = util * 0.5 - 4;

  // Logo
  const altoLogo = 70;
  if (logo) {
    const esc = Math.min(colIzq / logo.width, altoLogo / logo.height);
    pagina.drawImage(logo, { x: MARGEN + (colIzq - logo.width * esc) / 2, y: y - altoLogo, width: logo.width * esc, height: logo.height * esc });
  } else {
    const nom = partir(m.emisor.nombreComercial || m.emisor.razonSocial, fb, 13, colIzq - 10).slice(0, 3);
    nom.forEach((l, i) => texto(l, MARGEN + 5, y - 22 - i * 15, 13, true));
  }

  // Caja datos del emisor (izquierda)
  const lineasEmisor: [string, string, boolean][] = [];
  const agregar = (etq: string, val: string | null | undefined, negrita = false) => {
    if (val) lineasEmisor.push([etq, val, negrita]);
  };
  agregar('', m.emisor.razonSocial, true);
  if (m.emisor.nombreComercial && m.emisor.nombreComercial !== m.emisor.razonSocial) agregar('', m.emisor.nombreComercial, true);
  agregar('Dirección Matriz: ', m.emisor.dirMatriz);
  agregar('Dirección Sucursal: ', m.emisor.dirEstablecimiento);
  agregar('Contribuyente Especial Nro: ', m.emisor.contribuyenteEspecial);
  agregar('OBLIGADO A LLEVAR CONTABILIDAD: ', m.emisor.obligadoContabilidad ? 'SI' : 'NO');
  const renglonesEmisor: { t: string; b: boolean }[] = [];
  for (const [e, v, b] of lineasEmisor) partir(e + v, b ? fb : f, 8, colIzq - 12).forEach((t) => renglonesEmisor.push({ t, b }));
  const altoCajaEmisor = renglonesEmisor.length * 11 + 14;

  // Caja derecha
  const barras = code128(m.claveAcceso);
  const renglonesDer: { t: string; tam: number; b: boolean }[] = [
    { t: `R.U.C.: ${m.emisor.ruc}`, tam: 11, b: true },
    { t: m.titulo, tam: 13, b: true },
    { t: `No. ${m.numero}`, tam: 10, b: true },
    { t: 'NÚMERO DE AUTORIZACIÓN', tam: 8, b: true },
    { t: m.numeroAutorizacion || 'PENDIENTE DE AUTORIZACIÓN', tam: 7.5, b: false },
    { t: `FECHA Y HORA DE AUTORIZACIÓN: ${formatoFechaAut(m.fechaAutorizacion)}`, tam: 7.5, b: false },
    { t: `AMBIENTE: ${m.ambiente}`, tam: 8, b: false },
    { t: 'EMISIÓN: NORMAL', tam: 8, b: false },
    { t: 'CLAVE DE ACCESO', tam: 8, b: true },
  ];
  const altoBarras = 34;
  const altoCajaDer = renglonesDer.reduce((a, r) => a + r.tam + 4, 0) + altoBarras + 30;

  const yCajaEmisor = y - altoLogo - 6 - altoCajaEmisor;
  const yBaseEncabezado = Math.min(yCajaEmisor, y - altoCajaDer);

  caja(MARGEN, yCajaEmisor, colIzq, altoCajaEmisor);
  renglonesEmisor.forEach((r, i) => texto(r.t, MARGEN + 6, yCajaEmisor + altoCajaEmisor - 13 - i * 11, 8, r.b));

  caja(xDer, y - altoCajaDer, colDer, altoCajaDer);
  let yd = y - 16;
  for (const r of renglonesDer) {
    texto(r.t, xDer + 8, yd, r.tam, r.b);
    yd -= r.tam + 4;
  }
  // codigo de barras
  const anchoBarras = colDer - 16;
  const modulos = barras.split('').reduce((a, c) => a + Number(c), 0);
  const mod = anchoBarras / modulos;
  let xb = xDer + 8;
  let esBarra = true;
  for (const c of barras) {
    const w = Number(c) * mod;
    if (esBarra) pagina.drawRectangle({ x: xb, y: yd - altoBarras + 8, width: w, height: altoBarras, color: NEGRO });
    xb += w;
    esBarra = !esBarra;
  }
  texto(m.claveAcceso, xDer + 8, yd - altoBarras - 2, 7);

  y = yBaseEncabezado - 8;

  // ---------------- Receptor ----------------
  if (m.receptor.length) {
    const mitad = Math.ceil(m.receptor.length / 2);
    const cols = [m.receptor.slice(0, mitad), m.receptor.slice(mitad)];
    const anchoCol = util / 2 - 10;
    const renglones = cols.map((c) => c.flatMap(([e, v]) => partir(`${e}: ${v}`, f, 8, anchoCol)));
    const alto = Math.max(...renglones.map((r) => r.length)) * 11 + 10;
    caja(MARGEN, y - alto, util, alto);
    renglones.forEach((r, ci) => r.forEach((l, i) => texto(l, MARGEN + 6 + ci * (util / 2), y - 13 - i * 11, 8)));
    y -= alto + 8;
  }

  // ---------------- Tablas de detalle ----------------
  const dibujarTabla = (tb: TablaRide) => {
    const total = tb.columnas.reduce((a, c) => a + c.ancho, 0);
    const anchos = tb.columnas.map((c) => (c.ancho / total) * util);
    const encabezado = () => {
      const lineasEnc = tb.columnas.map((c, i) => partir(c.titulo, fb, 7, anchos[i] - 6));
      const h = Math.max(...lineasEnc.map((l) => l.length)) * 9 + 6;
      let x = MARGEN;
      tb.columnas.forEach((_c, i) => {
        caja(x, y - h, anchos[i], h, true);
        lineasEnc[i].forEach((l, k) => texto(l, x + 3, y - 9 - k * 9, 7, true));
        x += anchos[i];
      });
      y -= h;
    };
    if (tb.titulo) {
      const lineasTitulo = partir(tb.titulo, fb, 9, util);
      if (y - lineasTitulo.length * 12 < MARGEN + 60) nuevaPagina();
      lineasTitulo.forEach((l, i) => texto(l, MARGEN, y - 10 - i * 12, 9, true));
      y -= 4 + lineasTitulo.length * 12;
    }
    if (y < MARGEN + 40) nuevaPagina();
    encabezado();
    for (const fila of tb.filas) {
      const celdas = fila.map((v, i) => partir(v ?? '', f, 7.5, anchos[i] - 6));
      const h = Math.max(1, ...celdas.map((c) => c.length)) * 9.5 + 5;
      if (y - h < MARGEN + 10) {
        nuevaPagina();
        encabezado();
      }
      let x = MARGEN;
      celdas.forEach((lineas, i) => {
        caja(x, y - h, anchos[i], h);
        const alin = tb.columnas[i].alin ?? 'izq';
        lineas.forEach((l, k) => {
          const w = f.widthOfTextAtSize(l, 7.5);
          const xt = alin === 'der' ? x + anchos[i] - 3 - w : alin === 'centro' ? x + (anchos[i] - w) / 2 : x + 3;
          texto(l, xt, y - 9.5 - k * 9.5, 7.5);
        });
        x += anchos[i];
      });
      y -= h;
    }
    y -= 8;
  };
  m.tablas.forEach(dibujarTabla);

  // ---------------- Pie: adicionales + pagos (izq) y totales (der) ----------------
  const anchoIzq = util * 0.58;
  const anchoTot = util * 0.4;
  const xTot = MARGEN + util - anchoTot;
  const renglonesAd = m.adicionales.flatMap(([n, v]) => partir(`${n}: ${v}`, f, 7.5, anchoIzq - 12));
  const altoAd = m.adicionales.length ? renglonesAd.length * 10 + 24 : 0;
  const altoPagos = m.pagos?.length ? m.pagos.length * 12 + 30 : 0;
  const altoTot = m.totales.length * 13 + 4;
  const altoPie = Math.max(altoAd + altoPagos + (altoAd && altoPagos ? 8 : 0), altoTot);
  if (y - altoPie < MARGEN) nuevaPagina();

  // totales
  let yt = y;
  for (const [e, v] of m.totales) {
    const esTotal = /^(VALOR TOTAL|TOTAL)$/i.test(e.trim());
    caja(xTot, yt - 13, anchoTot * 0.65, 13, esTotal);
    caja(xTot + anchoTot * 0.65, yt - 13, anchoTot * 0.35, 13, esTotal);
    texto(e, xTot + 4, yt - 9.5, 7.5, esTotal);
    const w = (esTotal ? fb : f).widthOfTextAtSize(seguro(v), 8);
    texto(v, xTot + anchoTot - 4 - w, yt - 9.5, 8, esTotal);
    yt -= 13;
  }

  // adicionales
  let ya = y;
  if (m.adicionales.length) {
    caja(MARGEN, ya - altoAd, anchoIzq, altoAd);
    texto('Información Adicional', MARGEN + 6, ya - 12, 8.5, true);
    renglonesAd.forEach((l, i) => texto(l, MARGEN + 6, ya - 25 - i * 10, 7.5));
    ya -= altoAd + 8;
  }
  if (m.pagos?.length) {
    const w1 = anchoIzq * 0.72;
    const w2 = anchoIzq - w1;
    caja(MARGEN, ya - 14, w1, 14, true);
    caja(MARGEN + w1, ya - 14, w2, 14, true);
    texto('Forma de pago', MARGEN + 4, ya - 10, 7.5, true);
    texto('Valor', MARGEN + w1 + 4, ya - 10, 7.5, true);
    ya -= 14;
    for (const [d, v] of m.pagos) {
      caja(MARGEN, ya - 12, w1, 12);
      caja(MARGEN + w1, ya - 12, w2, 12);
      texto(partir(d, f, 7, w1 - 8)[0] ?? '', MARGEN + 4, ya - 9, 7);
      const w = f.widthOfTextAtSize(seguro(v), 7.5);
      texto(v, MARGEN + w1 + w2 - 4 - w, ya - 9, 7.5);
      ya -= 12;
    }
  }

  // linea de firma y mensaje al pie
  let yPie = Math.min(yt, ya) - 18;
  if (m.lineaFirma) {
    if (yPie < MARGEN + 50) { nuevaPagina(); yPie = y; }
    yPie -= 30;
    pagina.drawLine({ start: { x: MARGEN + util / 2 - 100, y: yPie }, end: { x: MARGEN + util / 2 + 100, y: yPie }, thickness: 0.7, color: NEGRO });
    const etq = 'Firma de recibido';
    texto(etq, MARGEN + util / 2 - f.widthOfTextAtSize(etq, 8) / 2, yPie - 11, 8);
    yPie -= 24;
  }
  if (m.pie && m.pie.trim()) {
    const lineasPie = partir(m.pie, f, 8, util);
    if (yPie - lineasPie.length * 10 < MARGEN) { nuevaPagina(); yPie = y; }
    lineasPie.forEach((l, i) => texto(l, MARGEN + (util - f.widthOfTextAtSize(l, 8)) / 2, yPie - i * 10, 8, false, GRIS));
  }

  // numeracion de paginas
  const paginas = pdf.getPages();
  paginas.forEach((p, i) =>
    p.drawText(`Página ${i + 1} de ${paginas.length}`, { x: ANCHO - MARGEN - 60, y: 14, size: 7, font: f, color: GRIS }),
  );
  return pdf.save();
}
