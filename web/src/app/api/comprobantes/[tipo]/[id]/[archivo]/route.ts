import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/session';
import { sql } from '@/lib/db';
import { manejador } from '@/lib/comprobantes/registro';
import { obtenerRide } from '@/lib/comprobantes/procesar';

export const dynamic = 'force-dynamic';

/** Descarga del RIDE (ride.pdf), XML autorizado (autorizado.xml) o XML firmado (firmado.xml) */
export async function GET(_req: Request, ctx: { params: Promise<{ tipo: string; id: string; archivo: string }> }) {
  const s = await sesionActual();
  if (!s?.emisorId) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
  const { tipo, id, archivo } = await ctx.params;
  const t = Number(tipo);
  const n = Number(id);
  let m;
  try {
    m = manejador(t);
  } catch {
    return NextResponse.json({ error: 'Tipo no válido' }, { status: 404 });
  }
  const [doc] = await sql<{ clave: string; numero: string }[]>`
    select ${sql(m.colClave)} clave, ${sql(m.colNumero)} numero from ${sql(m.tabla)} where id = ${n} and ${sql(m.colEmisor)} = ${s.emisorId}`;
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  const nombre = doc.clave || `${m.nombre}-${doc.numero || n}`;

  if (archivo === 'ride.pdf') {
    const pdf = await obtenerRide(t, n);
    return new NextResponse(Buffer.from(pdf), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}.pdf"` },
    });
  }
  if (archivo === 'autorizado.xml' || archivo === 'firmado.xml') {
    const [d] = await sql<{ xml_retornado: string | null; xml_firmado: string | null }[]>`
      select xml_retornado::text, xml_firmado from documentos_electronicos
      where id_tipo_comprobante = ${t} and id_comprobante = ${n} order by id desc limit 1`;
    const xml = archivo === 'autorizado.xml' ? d?.xml_retornado : d?.xml_firmado;
    if (!xml) return NextResponse.json({ error: 'XML no disponible' }, { status: 404 });
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="${nombre}.xml"` },
    });
  }
  return NextResponse.json({ error: 'Archivo no válido' }, { status: 404 });
}
