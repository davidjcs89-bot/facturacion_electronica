// TEMPORAL (migracion de Divad Closet desde la base Azure SQL del sistema anterior). Se borra al terminar.
// Protegida con MIGRACION_TOKEN. Lee de Azure solo con SELECT; escribe en la base de la app.
import { NextResponse, type NextRequest } from 'next/server';
import sqlServer from 'mssql';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

let pool: sqlServer.ConnectionPool | null = null;
async function azure() {
  if (pool?.connected) return pool;
  const c = JSON.parse(process.env.MIGRACION_AZURE ?? '{}');
  pool = await new sqlServer.ConnectionPool({
    server: c.server, database: c.database, user: c.user, password: c.password,
    options: { encrypt: true }, connectionTimeout: 30000, requestTimeout: 240000, pool: { max: 2 },
  }).connect();
  return pool;
}

const soloLectura = (q: string) => /^\s*(select|with)\b/i.test(q) && !/\b(insert|update|delete|merge|drop|alter|create|exec|truncate)\b/i.test(q);

export async function GET(req: NextRequest) {
  const tok = process.env.MIGRACION_TOKEN;
  if (!tok || req.nextUrl.searchParams.get('t') !== tok) return new NextResponse('no', { status: 404 });
  let p: { op: string; az?: string; pg?: string; tabla?: string; conflicto?: string; limite?: number };
  try {
    p = JSON.parse(Buffer.from(req.nextUrl.searchParams.get('q') ?? '', 'base64url').toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'q invalido' }, { status: 400 });
  }
  const t0 = Date.now();
  try {
    if (p.op === 'az') {
      if (!p.az || !soloLectura(p.az)) return NextResponse.json({ error: 'solo SELECT' }, { status: 400 });
      const r = await (await azure()).request().query(p.az);
      const filas = r.recordset ?? [];
      const lim = p.limite ?? 500;
      return NextResponse.json({ n: filas.length, filas: filas.slice(0, lim), ms: Date.now() - t0 });
    }
    if (p.op === 'pg') {
      const r = await sql.unsafe(p.pg ?? '');
      return NextResponse.json({ n: r.length, filas: r.slice(0, p.limite ?? 500), ms: Date.now() - t0 });
    }
    if (p.op === 'copiar') {
      // Copia filas de un SELECT de Azure (alias = nombres de columna en la app) a una tabla de la app.
      if (!p.az || !soloLectura(p.az) || !p.tabla || !/^[a-z_]+$/.test(p.tabla)) return NextResponse.json({ error: 'parametros' }, { status: 400 });
      const r = await (await azure()).request().query(p.az);
      const filas = (r.recordset ?? []) as Record<string, unknown>[];
      let insertadas = 0;
      for (let i = 0; i < filas.length; i += 200) {
        const lote = filas.slice(i, i + 200);
        const res = await sql`insert into ${sql(p.tabla)} ${sql(lote)} on conflict ${p.conflicto ? sql`(${sql(p.conflicto)})` : sql``} do nothing returning 1`;
        insertadas += res.length;
      }
      return NextResponse.json({ leidas: filas.length, insertadas, ms: Date.now() - t0 });
    }
    return NextResponse.json({ error: 'op' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message).slice(0, 1500), ms: Date.now() - t0 }, { status: 500 });
  }
}
