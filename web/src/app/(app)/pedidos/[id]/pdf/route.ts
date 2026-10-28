import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/session';
import { generarPdfPedido } from '../../../proformas/_comun/datos';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await sesionActual();
  if (!s?.emisorId) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
  try {
    const { pdf, numero } = await generarPdfPedido(Number((await ctx.params).id), s.emisorId);
    return new NextResponse(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Pedido-${numero}.pdf"` } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
