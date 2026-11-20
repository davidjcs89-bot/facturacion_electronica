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
  if (p.get('xmlstats')) {
    // solo tamaños, sin contenido: por año, columnas de texto de documentos_electronicos
    const cols = await sql<{ column_name: string }[]>`select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'documentos_electronicos' and data_type in ('text', 'character varying', 'xml', 'bytea')`;
    const nombres = cols.map((c) => c.column_name);
    const crudo = nombres.map((c) => `coalesce(octet_length(${'"' + c + '"'}), 0)`).join(' + ');
    const guardado = nombres.map((c) => `coalesce(pg_column_size(${'"' + c + '"'}), 0)`).join(' + ');
    const r = await sql.unsafe(`select extract(year from fecha_creacion)::int anio, count(*)::int docs,
      round(sum(${crudo}) / 1048576.0, 1) mb_texto, round(sum(${guardado}) / 1048576.0, 1) mb_guardado
      from documentos_electronicos group by 1 order by 1`);
    return NextResponse.json({ columnas: nombres, por_anio: r });
  }
  if (p.get('correo')) {
    // solo servidor y dominio del remitente (sin claves)
    const r = await sql`select id, servidor, puerto, split_part(direccion, '@', 2) dominio from cuentas_correo order by id`;
    const e = await sql`select count(*) n from emisor_correo`;
    return NextResponse.json({ sistema: r, empresas_con_correo_propio: e[0].n });
  }
  if (p.get('conteo')) {
    const e = Number(p.get('conteo'));
    const [r] = await sql`select
      (select count(*) from producto where id_emisor = ${e}) productos,
      (select count(*) from clientes where id_emisor = ${e}) clientes,
      (select count(*) from factura where id_emisor = ${e} and fecha_emision >= now() - interval '30 days') facturas30,
      (select round(avg(n), 1) from (select count(*) n from detalle_factura d join factura f on f.id = d.id_factura where f.id_emisor = ${e} and f.fecha_emision >= now() - interval '60 days' group by f.id) x) lineas_prom,
      (select string_agg(descripcion, ' | ') from (select fp.descripcion_form_pago descripcion, count(*) c from detalle_pago_factura dp join factura f on f.id = dp.id_factura join formas_de_pago fp on fp.id = dp.id_form_pago where f.id_emisor = ${e} and f.fecha_emision >= now() - interval '60 days' group by 1 order by 2 desc limit 4) y) pagos,
      (select count(*) from usuario where id_emisor = ${e}) usuarios`;
    return NextResponse.json(r);
  }
  if (p.get('ambientes')) {
    // Solo lectura: ambiente de cada empresa, firma, habilitacion y facturas recientes por ambiente
    const r = await sql`
      select e.id, e.razon_social, a.codigo_ambiente amb, (select count(*) from firma_emisor f where f.id_emisor = e.id) firma,
        (select max(h.fecha_hasta) from emisor_habilitacion h where h.id_emisor = e.id) hasta,
        (select count(*) from factura f where f.id_emisor = e.id and f.fecha_emision >= now() - interval '60 days' and substr(f.clave_de_acceso, 24, 1) = '2') prod60,
        (select count(*) from factura f where f.id_emisor = e.id and f.fecha_emision >= now() - interval '60 days' and substr(f.clave_de_acceso, 24, 1) = '1') pru60,
        (select max(f.fecha_emision) from factura f where f.id_emisor = e.id) ultima,
        (select string_agg(pa.ambiente || ':' || pe.numero_establecimiento || '-' || pe.numero_emision, ' ') from punto_emision_app pa join puntos_emisior pe on pe.id = pa.id_punto where pe.id_emisor = e.id) puntos_app
      from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente order by e.id`;
    return NextResponse.json(r);
  }
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
