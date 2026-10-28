import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Verificacion de salud: base de datos y acceso a los servicios del SRI (sin datos sensibles) */
export async function GET() {
  const r: Record<string, string> = {};
  try {
    const [x] = await sql<{ n: number }[]>`select count(*) n from emisor`;
    r.base = `ok (${x.n} emisores)`;
  } catch (e) {
    r.base = `error: ${(e as Error).message}`;
  }
  for (const [k, url] of [
    ['sri_pruebas', 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'],
    ['sri_produccion', 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'],
  ]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const resp = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      r[k] = `HTTP ${resp.status}`;
    } catch (e) {
      r[k] = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json(r);
}
