import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/session';
import { configImpresion } from '@/lib/impresion';

export const dynamic = 'force-dynamic';

/** Formato de impresion y accion al emitir de la empresa en sesion */
export async function GET() {
  const s = await sesionActual();
  if (!s?.emisorId) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
  return NextResponse.json(await configImpresion(s.emisorId), { headers: { 'Cache-Control': 'no-store' } });
}
