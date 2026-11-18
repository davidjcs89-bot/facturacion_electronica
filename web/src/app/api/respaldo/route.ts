// TEMPORAL: respaldo completo de la base (solo en vista previa, con sesión y con RESPALDO_HABILITADO). Se borra al terminar.
import { NextResponse, type NextRequest } from 'next/server';
import { createGzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function permitido() {
  return process.env.VERCEL_ENV === 'preview' && process.env.RESPALDO_HABILITADO === 'si';
}

async function tablas() {
  return sql<{ t: string; bytes: number; filas: number }[]>`
    select c.relname t, pg_total_relation_size(c.oid) bytes, c.reltuples::bigint filas
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by c.relname`;
}

function valor(v: unknown): unknown {
  if (Buffer.isBuffer(v)) return { b64: v.toString('base64') };
  if (v instanceof Date) return v.toISOString();
  return v;
}

export async function GET(req: NextRequest) {
  if (!permitido()) return new NextResponse('no', { status: 404 });
  const p = req.nextUrl.searchParams;
  const lista = await tablas();
  if (p.get('info')) {
    const [db] = await sql<{ s: string }[]>`select pg_size_pretty(pg_database_size(current_database())) s`;
    return NextResponse.json({ base: db.s, tablas: lista });
  }
  // ?tabla=a,b  (por defecto todas)  &excluir=x,y
  const pedidas = (p.get('tabla') ?? '').split(',').filter(Boolean);
  const excluir = new Set((p.get('excluir') ?? '').split(',').filter(Boolean));
  const sel = lista.map((x) => x.t).filter((t) => (pedidas.length ? pedidas.includes(t) : true) && !excluir.has(t));
  const nombre = `respaldo-facturacion-${new Date().toISOString().slice(0, 10)}${p.get('nombre') ? '-' + p.get('nombre') : ''}.ndjson.gz`;

  async function* generar() {
    yield JSON.stringify({ respaldo: 'facturacion-electronica', fecha: new Date().toISOString(), tablas: sel }) + '\n';
    const seqs = await sql`select sequencename, last_value from pg_sequences where schemaname = 'public'`;
    yield JSON.stringify({ secuencias: seqs }) + '\n';
    for (const t of sel) {
      const cols = await sql<{ column_name: string; data_type: string }[]>`
        select column_name, data_type from information_schema.columns
        where table_schema = 'public' and table_name = ${t} order by ordinal_position`;
      yield JSON.stringify({ tabla: t, columnas: cols }) + '\n';
      let n = 0;
      for await (const filas of sql`select * from ${sql(t)}`.cursor(200)) {
        let trozo = '';
        for (const f of filas) {
          const o: Record<string, unknown> = {};
          for (const k of Object.keys(f)) o[k] = valor((f as Record<string, unknown>)[k]);
          trozo += JSON.stringify({ t, f: o }) + '\n';
          n++;
        }
        yield trozo;
      }
      yield JSON.stringify({ fin: t, filas: n }) + '\n';
    }
    yield JSON.stringify({ completo: true }) + '\n';
  }

  const gz = Readable.from(generar()).pipe(createGzip({ level: 6 }));
  return new NextResponse(Readable.toWeb(gz) as ReadableStream, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
