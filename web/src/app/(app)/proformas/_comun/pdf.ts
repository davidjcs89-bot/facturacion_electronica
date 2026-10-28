import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { sql } from '@/lib/db';
import { money, money3, fecha } from '@/lib/formato';
import type { LineaDoc } from './lineas';

type Datos = {
  titulo: string; numero: string; fecha: Date; emisorId: number; idCliente: number;
  lineas: LineaDoc[]; totales: [string, number][]; notas?: [string, string][];
};

function seguro(s: string | null | undefined) {
  return Array.from(String(s ?? '').replace(/[\r\t\n]/g, ' '))
    .map((ch) => (ch.charCodeAt(0) < 256 ? ch : ch.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0) || '?'))
    .map((ch) => (ch.charCodeAt(0) < 256 ? ch : '?'))
    .join('');
}

function cortar(t: string, f: PDFFont, tam: number, ancho: number): string[] {
  const out: string[] = [];
  let actual = '';
  for (const p of seguro(t).split(' ')) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (f.widthOfTextAtSize(prueba, tam) <= ancho) actual = prueba;
    else {
      if (actual) out.push(actual);
      actual = p;
    }
  }
  out.push(actual);
  return out;
}

/** PDF simple para proformas y pedidos (no es un documento tributario) */
export async function pdfDocumento(d: Datos): Promise<Uint8Array> {
  const [e] = await sql<{ ruc: string; razon_social: string; nombre_comercial: string; direccion_matriz: string; logo: Uint8Array | null; mime: string | null }[]>`
    select e.ruc, e.razon_social, e.nombre_comercial, e.direccion_matriz, l.contenido logo, l.tipo_mime mime
    from emisor e left join logo_emisor l on l.id_emisor = e.id where e.id = ${d.emisorId}`;
  const [c] = await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null; telefono_movil: string | null }[]>`
    select nombre_cliente, identificacion, direccion, correo, telefono_movil from clientes where id = ${d.idCliente}`;
  const pdf = await PDFDocument.create();
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 36;
  let pg = pdf.addPage([W, H]);
  let y = H - M;
  const txt = (s: string, x: number, yy: number, tam = 9, b = false) => pg.drawText(seguro(s), { x, y: yy, size: tam, font: b ? fb : f, color: rgb(0, 0, 0) });
  const linea = (yy: number) => pg.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });

  if (e.logo && e.mime) {
    try {
      const img = e.mime.includes('png') ? await pdf.embedPng(e.logo) : await pdf.embedJpg(e.logo);
      const esc = Math.min(160 / img.width, 60 / img.height);
      pg.drawImage(img, { x: M, y: y - img.height * esc, width: img.width * esc, height: img.height * esc });
    } catch { /* sin logo */ }
  }
  txt(e.nombre_comercial || e.razon_social, M + 180, y - 12, 13, true);
  txt(`${e.razon_social} · RUC ${e.ruc}`, M + 180, y - 28, 9);
  txt(e.direccion_matriz, M + 180, y - 41, 9);
  y -= 78;
  txt(`${d.titulo} N.º ${d.numero}`, M, y, 14, true);
  txt(`Fecha: ${fecha(d.fecha)}`, W - M - 120, y, 10);
  y -= 22;
  linea(y + 8);
  txt(`Cliente: ${c.nombre_cliente}`, M, y - 4, 9.5, true);
  txt(`Identificación: ${c.identificacion}`, M, y - 18);
  txt(`Dirección: ${c.direccion ?? ''}`, M, y - 31);
  txt(`Correo: ${(c.correo ?? '').toLowerCase()}   Teléfono: ${c.telefono_movil ?? ''}`, M, y - 44);
  y -= 62;

  const cols = [
    { t: 'Código', w: 70, der: false }, { t: 'Descripción', w: 215, der: false }, { t: 'Cant.', w: 40, der: true },
    { t: 'P. unitario', w: 62, der: true }, { t: 'Desc.', w: 50, der: true }, { t: 'Subtotal', w: 86, der: true },
  ];
  const cabecera = () => {
    pg.drawRectangle({ x: M, y: y - 16, width: W - 2 * M, height: 16, color: rgb(0.92, 0.92, 0.92) });
    let x = M;
    for (const col of cols) {
      const w = fb.widthOfTextAtSize(col.t, 8);
      txt(col.t, col.der ? x + col.w - 4 - w : x + 4, y - 11, 8, true);
      x += col.w;
    }
    y -= 18;
  };
  cabecera();
  for (const l of d.lineas) {
    const desc = cortar(l.nombre + (l.adicional && l.adicional !== l.nombre ? ` - ${l.adicional}` : ''), f, 8.5, cols[1].w - 8);
    const h = desc.length * 11 + 4;
    if (y - h < M + 120) {
      pg = pdf.addPage([W, H]);
      y = H - M;
      cabecera();
    }
    const vals = [l.codigo, '', String(l.cantidad), money3(l.precio_unitario), money(l.descuento), money(l.sub_total)];
    let x = M;
    cols.forEach((col, i) => {
      if (i === 1) desc.forEach((t, k) => txt(t, x + 4, y - 10 - k * 11, 8.5));
      else {
        const w = f.widthOfTextAtSize(seguro(vals[i]), 8.5);
        txt(vals[i], col.der ? x + col.w - 4 - w : x + 4, y - 10, 8.5);
      }
      x += col.w;
    });
    y -= h;
    linea(y + 1);
  }
  y -= 10;
  for (const [k, v] of d.totales) {
    const esTotal = k.toUpperCase() === 'TOTAL';
    txt(k, W - M - 200, y, 9, esTotal);
    const s = money(v);
    txt(s, W - M - 4 - (esTotal ? fb : f).widthOfTextAtSize(s, 9), y, 9, esTotal);
    y -= 13;
  }
  if (d.notas?.length) {
    y -= 8;
    for (const [k, v] of d.notas) {
      for (const t of cortar(`${k}: ${v}`, f, 9, W - 2 * M)) {
        txt(t, M, y, 9);
        y -= 12;
      }
    }
  }
  pg.drawText('Documento sin valor tributario', { x: M, y: 20, size: 7, font: f, color: rgb(0.4, 0.4, 0.4) });
  return pdf.save();
}
