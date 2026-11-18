// TEMPORAL (migracion de Divad Closet desde la base Azure SQL del sistema anterior). Se borra al terminar.
// Protegida con MIGRACION_TOKEN. Lee de Azure solo con SELECT; escribe en la base de la app.
import { NextResponse, type NextRequest } from 'next/server';
import sqlServer from 'mssql';
import { sql } from '@/lib/db';
import { createDecipheriv } from 'node:crypto';
import { leerCertificado } from '@/lib/sri/firma';
import { cifrar } from '@/lib/cifrado';

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


async function mapaAzure() {
  const r = await (await azure()).request().query('select name from sys.tables');
  return new Map((r.recordset as { name: string }[]).map((t) => [t.name.toLowerCase(), t.name]));
}
async function columnasComunes(tabla: string, nombreAz: string, excluir: string[] = []) {
  const a = await (await azure()).request().query(`select lower(column_name) c from information_schema.columns where table_name = '${nombreAz}'`);
  const colsAz = new Set((a.recordset as { c: string }[]).map((x) => x.c));
  const colsPg = await sql<{ c: string }[]>`select column_name c from information_schema.columns where table_schema = 'public' and table_name = ${tabla}`;
  return colsPg.map((x) => x.c).filter((c) => colsAz.has(c) && !excluir.includes(c));
}

const soloLectura = (q: string) => /^\s*(select|with)\b/i.test(q) && !/\b(insert|update|delete|merge|drop|alter|create|exec|truncate)\b/i.test(q);

export async function GET(req: NextRequest) {
  const tok = process.env.MIGRACION_TOKEN;
  if (!tok || req.nextUrl.searchParams.get('t') !== tok) return new NextResponse('no', { status: 404 });
  let p: { op: string; emisor?: number; n?: number; dato?: string; emisores?: number[]; tablas?: string[]; desde?: number; hasta?: number; paso?: number; az?: string; pg?: string; tabla?: string; conflicto?: string; limite?: number };
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
    if (p.op === 'diffall') {
      // Por tabla: filas en Azure, en la app, ids que faltan en la app, ids solo en la app, y filas con el mismo id pero distinto contenido.
      const mapa = await mapaAzure();
      const tablas = p.tablas ?? [...mapa.keys()].filter((t) => t !== 'log');
      const out: Record<string, unknown> = {};
      for (const t of tablas) {
        const az = mapa.get(t);
        if (!az) { out[t] = 'no esta en Azure'; continue; }
        const existe = await sql`select 1 from information_schema.tables where table_schema='public' and table_name=${t}`;
        if (!existe.length) { out[t] = 'no esta en la app'; continue; }
        const soloId = t === 'documentos_electronicos';
        const cols = soloId ? ['id', 'id_comprobante', 'id_tipo_comprobante'] : await columnasComunes(t, az, ['ride']);
        if (!cols.includes('id')) { out[t] = 'sin id'; continue; }
        const ra = await (await azure()).request().query(`select ${cols.map((c) => `[${c}]`).join(',')} from [${az}]`);
        const fa = ((ra.recordset ?? []) as Record<string, unknown>[]).map(minus);
        const fp = (await sql.unsafe(`select ${cols.map((c) => `"${c}"`).join(',')} from "${t}"`)) as Record<string, unknown>[];
        const mp = new Map(fp.map((f) => [Number(f.id), f]));
        const ia = new Set(fa.map((f) => Number(f.id)));
        let faltan = 0; const dist: number[] = []; const distCols = new Set<string>();
        for (const f of fa) {
          const g = mp.get(Number(f.id));
          if (!g) { faltan++; continue; }
          const cs = cols.filter((k) => norm(f[k]) !== norm(g[k]));
          if (cs.length) { dist.push(Number(f.id)); cs.forEach((c) => distCols.add(c)); }
        }
        const soloPg = fp.filter((f) => !ia.has(Number(f.id))).map((f) => Number(f.id));
        out[t] = { az: fa.length, pg: fp.length, faltan, distintas: dist.length, dist_ids: dist.slice(0, 15), dist_cols: [...distCols].slice(0, 10), solo_pg: soloPg.length, solo_pg_ids: soloPg.slice(0, 15) };
      }
      return NextResponse.json({ out, ms: Date.now() - t0 });
    }
    if (p.op === 'copiarfaltan') {
      // Copia de Azure a la app las filas cuyo id no existe en la app (nunca pisa filas existentes). Sin PDF (ride).
      const mapa = await mapaAzure();
      const t = p.tabla ?? ''; const az = mapa.get(t);
      if (!az || !/^[a-z_]+$/.test(t)) return NextResponse.json({ error: 'tabla' }, { status: 400 });
      const cols = await columnasComunes(t, az, ['ride']);
      const hasta = p.hasta ?? 2147483647; const paso = p.paso ?? 200;
      let desde = p.desde ?? 0; let leidas = 0; let faltaban = 0; let insertadas = 0;
      while (desde <= hasta && Date.now() - t0 < 40000) {
        const fin = Math.min(desde + paso - 1, hasta);
        const idsPg = new Set((await sql.unsafe(`select id from "${t}" where id between ${desde} and ${fin}`) as { id: number }[]).map((x) => Number(x.id)));
        const ra = await (await azure()).request().query(`select ${cols.map((c) => `[${c}]`).join(',')} from [${az}] where id between ${desde} and ${fin} order by id`);
        const filas = ((ra.recordset ?? []) as Record<string, unknown>[]).map(minus).filter((f) => !idsPg.has(Number(f.id)));
        leidas += ra.recordset?.length ?? 0; faltaban += filas.length;
        for (let i = 0; i < filas.length; i += 50) {
          const res = await sql`insert into ${sql(t)} ${sql(filas.slice(i, i + 50) as never, cols as never)} on conflict (id) do nothing returning 1`;
          insertadas += res.length;
        }
        desde = fin + 1;
      }
      return NextResponse.json({ tabla: t, leidas, faltaban, insertadas, siguiente: desde > hasta ? null : desde, ms: Date.now() - t0 });
    }
    if (p.op === 'parte') {
      // Trozo de un archivo de firma CIFRADO (AES-256-GCM con MIGRACION_LLAVE); se arma en 'cargarfirma'.
      await sql`create table if not exists migr_partes (emisor int, n int, dato text, primary key (emisor, n))`;
      await sql`insert into migr_partes ${sql({ emisor: Number(p.emisor), n: Number(p.n), dato: String(p.dato) })} on conflict (emisor, n) do update set dato = excluded.dato`;
      return NextResponse.json({ ok: true });
    }
    if (p.op === 'cargarfirma') {
      const em = Number(p.emisor);
      const partes = await sql<{ dato: string }[]>`select dato from migr_partes where emisor = ${em} order by n`;
      const todo = Buffer.from(partes.map((x) => x.dato).join(''), 'base64');
      const llave = Buffer.from(process.env.MIGRACION_LLAVE ?? '', 'hex');
      const iv = todo.subarray(0, 12); const tag = todo.subarray(todo.length - 16); const cuerpo = todo.subarray(12, todo.length - 16);
      const d = createDecipheriv('aes-256-gcm', llave, iv); d.setAuthTag(tag);
      const p12 = Buffer.concat([d.update(cuerpo), d.final()]);
      const r = await (await azure()).request().query(`select Contrasena, Archivo_firma from Emisor where id = ${em}`);
      const fila = r.recordset?.[0] as { Contrasena: string; Archivo_firma: string } | undefined;
      if (!fila) return NextResponse.json({ error: 'emisor' }, { status: 400 });
      const clave = String(fila.Contrasena ?? '');
      const cert = leerCertificado(p12, clave);
      const nombre = String(fila.Archivo_firma ?? '').split(/[\\/]/).pop() ?? 'firma.p12';
      await sql`
        insert into firma_emisor (id_emisor, archivo, nombre_archivo, clave_cifrada, titular, valido_desde, valido_hasta)
        values (${em}, ${p12}, ${nombre}, ${cifrar(clave)}, ${cert.titular}, ${cert.validoDesde}, ${cert.validoHasta})
        on conflict (id_emisor) do update set archivo = excluded.archivo, nombre_archivo = excluded.nombre_archivo,
          clave_cifrada = excluded.clave_cifrada, titular = excluded.titular, valido_desde = excluded.valido_desde,
          valido_hasta = excluded.valido_hasta, fecha_carga = now() at time zone 'America/Guayaquil'`;
      await sql`delete from migr_partes where emisor = ${em}`;
      return NextResponse.json({ emisor: em, titular: cert.titular, valido_hasta: cert.validoHasta, bytes: p12.length });
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

// POST: firma electronica cifrada en el cuerpo (no queda en registros de URL). Cuerpo: { t, emisor, dato (base64 iv+cifrado+tag) }
export async function POST(req: NextRequest) {
  const tok = process.env.MIGRACION_TOKEN;
  const b = (await req.json()) as { t?: string; emisor?: number; dato?: string };
  if (!tok || b.t !== tok) return new NextResponse('no', { status: 404 });
  try {
    const em = Number(b.emisor);
    const todo = Buffer.from(String(b.dato ?? ''), 'base64');
    const llave = Buffer.from(process.env.MIGRACION_LLAVE ?? '', 'hex');
    const iv = todo.subarray(0, 12); const tag = todo.subarray(todo.length - 16); const cuerpo = todo.subarray(12, todo.length - 16);
    const d = createDecipheriv('aes-256-gcm', llave, iv); d.setAuthTag(tag);
    const p12 = Buffer.concat([d.update(cuerpo), d.final()]);
    const r = await (await azure()).request().query(`select Contrasena, Archivo_firma from Emisor where id = ${em}`);
    const fila = r.recordset?.[0] as { Contrasena: string; Archivo_firma: string } | undefined;
    if (!fila) return NextResponse.json({ error: 'emisor' }, { status: 400 });
    const clave = String(fila.Contrasena ?? '');
    const cert = leerCertificado(p12, clave);
    const nombre = String(fila.Archivo_firma ?? '').split(/[\\/]/).pop() ?? 'firma.p12';
    await sql`
      insert into firma_emisor (id_emisor, archivo, nombre_archivo, clave_cifrada, titular, valido_desde, valido_hasta)
      values (${em}, ${p12}, ${nombre}, ${cifrar(clave)}, ${cert.titular}, ${cert.validoDesde}, ${cert.validoHasta})
      on conflict (id_emisor) do update set archivo = excluded.archivo, nombre_archivo = excluded.nombre_archivo,
        clave_cifrada = excluded.clave_cifrada, titular = excluded.titular, valido_desde = excluded.valido_desde,
        valido_hasta = excluded.valido_hasta, fecha_carga = now() at time zone 'America/Guayaquil'`;
    return NextResponse.json({ emisor: em, titular: cert.titular, valido_hasta: cert.validoHasta });
  } catch (e) {
    return NextResponse.json({ emisor: b.emisor, error: String((e as Error).message).slice(0, 300) }, { status: 500 });
  }
}
