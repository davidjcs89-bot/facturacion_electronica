import { NextResponse, type NextRequest } from 'next/server';
import { sesionActual } from '@/lib/session';
import { sql } from '@/lib/db';
import { manejador } from '@/lib/comprobantes/registro';
import { conImpresion } from '@/lib/comprobantes/procesar';
import { configImpresion, ticketHtml, type FormatoImpresion } from '@/lib/impresion';
import { modeloTicketDoc } from '@/app/(app)/proformas/_comun/datos';
import { ESTADO } from '@/lib/constantes';

export const dynamic = 'force-dynamic';

/**
 * Impresion de un comprobante segun el formato de la empresa (Configuracion -> Impresion):
 * A4 -> el RIDE en PDF; ticket80 / ticket58 -> ticket HTML para impresora termica.
 * tipo: 1..6 (tipo_documento) o «proforma» / «pedido». ?auto=1 imprime al abrir; ?formato= fuerza un formato.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ tipo: string; id: string }> }) {
  const s = await sesionActual();
  if (!s?.emisorId) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
  const { tipo, id } = await ctx.params;
  const n = Number(id);
  const q = req.nextUrl.searchParams;
  const cfg = await configImpresion(s.emisorId);
  const pedido = q.get('formato');
  const formato: FormatoImpresion = pedido === 'a4' || pedido === 'ticket80' || pedido === 'ticket58' ? pedido : cfg.formato;
  const auto = q.get('auto') === '1';
  const html = (h: string) => new NextResponse(h, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

  try {
    if (tipo === 'proforma' || tipo === 'pedido') {
      if (formato === 'a4') return NextResponse.redirect(new URL(`/${tipo === 'proforma' ? 'proformas' : 'pedidos'}/${n}/pdf`, req.url));
      const m = await modeloTicketDoc(tipo, n, s.emisorId);
      return html(ticketHtml(m, formato === 'ticket58' ? 58 : 80, { auto, tributario: false }));
    }
    const t = Number(tipo);
    const mj = manejador(t);
    const [doc] = await sql<{ estado: number; fecha_autorizacion: Date | null; clave: string | null }[]>`
      select estado, fecha_autorizacion, ${sql(mj.colClave)} clave from ${sql(mj.tabla)} where id = ${n} and ${sql(mj.colEmisor)} = ${s.emisorId}`;
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (formato === 'a4') return NextResponse.redirect(new URL(`/api/comprobantes/${t}/${n}/ride.pdf`, req.url));
    const autorizado = doc.estado === ESTADO.AUTORIZADO;
    const fechaAut = autorizado && doc.fecha_autorizacion ? new Date(doc.fecha_autorizacion).toISOString().slice(0, 19) : null;
    const modelo = await conImpresion(t, n, await mj.modeloRide(n, { numeroAutorizacion: doc.clave, fechaAutorizacion: fechaAut }));
    return html(ticketHtml(modelo, formato === 'ticket58' ? 58 : 80, { auto, tributario: true }));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
