import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/session';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await sesionActual();
  if (!s?.emisorId) return new NextResponse(null, { status: 401 });
  const [l] = await sql<{ contenido: Uint8Array; tipo_mime: string }[]>`select contenido, tipo_mime from logo_emisor where id_emisor = ${s.emisorId}`;
  if (!l) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(l.contenido), { headers: { 'Content-Type': l.tipo_mime, 'Cache-Control': 'private, max-age=60' } });
}
