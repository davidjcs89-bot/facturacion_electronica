// TEMPORAL (traspaso de firmas y logos del sistema anterior). Protegida con MIGRACION_TOKEN. Se borra al terminar.
import { NextResponse, type NextRequest } from 'next/server';
import { createDecipheriv } from 'node:crypto';
import { sql } from '@/lib/db';
import { leerCertificado } from '@/lib/sri/firma';
import { cifrar } from '@/lib/cifrado';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const tok = process.env.MIGRACION_TOKEN;
  if (!tok || req.nextUrl.searchParams.get('t') !== tok) return new NextResponse('no', { status: 404 });
  try {
    const p = JSON.parse(Buffer.from(req.nextUrl.searchParams.get('q') ?? '', 'base64url').toString('utf8')) as { pg: string };
    const r = await sql.unsafe(p.pg);
    return NextResponse.json({ n: r.length, filas: r.slice(0, 500) });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message).slice(0, 500) }, { status: 500 });
  }
}

// Cuerpo: { t, tipo: 'firma' | 'logo', emisor, nombre, dato (base64 de iv + cifrado AES-256-GCM + tag) }
export async function POST(req: NextRequest) {
  const tok = process.env.MIGRACION_TOKEN;
  const b = (await req.json()) as { t?: string; tipo?: string; emisor?: number; nombre?: string; dato?: string };
  if (!tok || b.t !== tok) return new NextResponse('no', { status: 404 });
  const em = Number(b.emisor);
  try {
    const todo = Buffer.from(String(b.dato ?? ''), 'base64');
    const llave = Buffer.from(process.env.MIGRACION_LLAVE ?? '', 'hex');
    const d = createDecipheriv('aes-256-gcm', llave, todo.subarray(0, 12));
    d.setAuthTag(todo.subarray(todo.length - 16));
    const bytes = Buffer.concat([d.update(todo.subarray(12, todo.length - 16)), d.final()]);
    if (b.tipo === 'logo') {
      const png = bytes[0] === 0x89 && bytes[1] === 0x50;
      await sql`insert into logo_emisor (id_emisor, contenido, tipo_mime) values (${em}, ${bytes}, ${png ? 'image/png' : 'image/jpeg'})
        on conflict (id_emisor) do nothing`;
      return NextResponse.json({ emisor: em, logo: bytes.length });
    }
    const [e] = await sql<{ contrasena: string | null }[]>`select contrasena from emisor where id = ${em}`;
    const clave = String(e?.contrasena ?? '');
    const cert = leerCertificado(bytes, clave);
    await sql`
      insert into firma_emisor (id_emisor, archivo, nombre_archivo, clave_cifrada, titular, valido_desde, valido_hasta)
      values (${em}, ${bytes}, ${String(b.nombre ?? 'firma.p12')}, ${cifrar(clave)}, ${cert.titular}, ${cert.validoDesde}, ${cert.validoHasta})
      on conflict (id_emisor) do nothing`;
    return NextResponse.json({ emisor: em, titular: cert.titular, valido_hasta: cert.validoHasta });
  } catch (e) {
    return NextResponse.json({ emisor: em, error: String((e as Error).message).slice(0, 300) }, { status: 500 });
  }
}
