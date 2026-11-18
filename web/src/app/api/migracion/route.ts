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

const minus = (f: Record<string, unknown>) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k.toLowerCase(), v]));
function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 19);
  if (Buffer.isBuffer(v)) return 'b' + v.length;
  if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
  if (typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v).trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? String(Math.round(Number(s) * 1e6) / 1e6) : s;
}

const soloLectura = (q: string) => /^\s*(select|with)\b/i.test(q) && !/\b(insert|update|delete|merge|drop|alter|create|exec|truncate)\b/i.test(q);

export async function GET(req: NextRequest) {
  const tok = process.env.MIGRACION_TOKEN;
  if (!tok || req.nextUrl.searchParams.get('t') !== tok) return new NextResponse('no', { status: 404 });
  let p: { op: string; emisores?: number[]; az?: string; pg?: string; tabla?: string; conflicto?: string; limite?: number };
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
      const filas = ((r.recordset ?? []) as Record<string, unknown>[]).map(minus);
      let insertadas = 0;
      for (let i = 0; i < filas.length; i += 200) {
        const lote = filas.slice(i, i + 200);
        const res = await sql`insert into ${sql(p.tabla)} ${sql(lote)} on conflict ${p.conflicto ? sql`(${sql(p.conflicto)})` : sql``} do nothing returning 1`;
        insertadas += res.length;
      }
      return NextResponse.json({ leidas: filas.length, insertadas, ms: Date.now() - t0 });
    }
    if (p.op === 'bloquear') {
      // Unica escritura en Azure, autorizada por el usuario: los emisores indicados dejan de poder iniciar sesion
      // en el sistema anterior (fecha_hasta = ayer). Devuelve las fechas anteriores para poder revertir.
      const ids = (p.emisores ?? []).map(Number).filter((n) => Number.isInteger(n));
      if (!ids.length) return NextResponse.json({ error: 'emisores' }, { status: 400 });
      const lista = ids.join(',');
      const antes = await (await azure()).request().query(`select id_emisor, fecha_hasta from Emisor_habilitacion where id_emisor in (${lista})`);
      await (await azure()).request().query(`update Emisor_habilitacion set fecha_hasta = dateadd(day, -1, getdate()) where id_emisor in (${lista}) and fecha_hasta > getdate()`);
      return NextResponse.json({ antes: antes.recordset, ms: Date.now() - t0 });
    }
    if (p.op === 'diff') {
      // Compara filas de Azure con la tabla de la app por id: faltan / iguales / distintas (con columnas que difieren).
      if (!p.az || !soloLectura(p.az) || !p.tabla || !/^[a-z_]+$/.test(p.tabla)) return NextResponse.json({ error: 'parametros' }, { status: 400 });
      const r = await (await azure()).request().query(p.az);
      const filas = ((r.recordset ?? []) as Record<string, unknown>[]).map(minus);
      const ids = filas.map((f) => Number(f.id));
      const enPg = ids.length ? await sql`select * from ${sql(p.tabla)} where id = any(${ids})` : [];
      const mapa = new Map(enPg.map((f) => [Number(f.id), f as Record<string, unknown>]));
      const faltan: number[] = []; const distintas: { id: number; cols: string[] }[] = []; let iguales = 0;
      for (const f of filas) {
        const g = mapa.get(Number(f.id));
        if (!g) { faltan.push(Number(f.id)); continue; }
        const cols = Object.keys(f).filter((k) => norm(f[k]) !== norm(g[k]));
        if (cols.length) distintas.push({ id: Number(f.id), cols }); else iguales++;
      }
      return NextResponse.json({ az: filas.length, iguales, faltan_n: faltan.length, faltan: faltan.slice(0, 300), distintas_n: distintas.length, distintas: distintas.slice(0, 50), ms: Date.now() - t0 });
    }
    return NextResponse.json({ error: 'op' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message).slice(0, 1500), ms: Date.now() - t0 }, { status: 500 });
  }
}
