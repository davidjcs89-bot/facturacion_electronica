// TEMPORAL (noche del 20/11/2026): mantenimiento de documentos_electronicos aprobado por David.
// Solo responde en la vista previa (protegida por Vercel) con MANTENIMIENTO_HABILITADO=si. Se borra al terminar.
import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { comprimirXml } from '@/lib/comprobantes/xmlGuardado';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const permitido = () => process.env.VERCEL_ENV === 'preview' && process.env.MANTENIMIENTO_HABILITADO === 'si';

export async function GET(req: NextRequest) {
  if (!permitido()) return new NextResponse('no', { status: 404 });
  const accion = req.nextUrl.searchParams.get('accion');
  const t0 = Date.now();

  if (accion === 'columnas') {
    const r = await sql`select table_schema, column_name, data_type from information_schema.columns
      where table_name = 'documentos_electronicos' order by table_schema, ordinal_position`;
    const [u] = await sql`select current_database() db, current_user u, current_setting('search_path') sp`;
    return NextResponse.json({ u, r });
  }
  if (accion === 'estado') {
    const [r] = await sql`select
      count(*) filter (where xml_generado is not null and (xml_retornado is not null or xml_retornado_gz is not null))::int generado_por_vaciar,
      count(*) filter (where ride is not null)::int rides_guardados,
      count(*) filter (where xml_retornado is not null and fecha_modificacion < (now() at time zone 'America/Guayaquil') - interval '2 years')::int por_comprimir,
      count(*) filter (where xml_retornado_gz is not null)::int comprimidos,
      pg_size_pretty(pg_total_relation_size('documentos_electronicos')) tabla,
      pg_size_pretty(pg_database_size(current_database())) base
      from documentos_electronicos`;
    return NextResponse.json(r);
  }

  // 1. XML sin firmar de comprobantes ya autorizados: no se usa nunca
  if (accion === 'vaciar_generado') {
    const r = await sql`update documentos_electronicos set xml_generado = null
      where xml_generado is not null and (xml_retornado is not null or xml_retornado_gz is not null)`;
    return NextResponse.json({ vaciados: r.count });
  }

  // 2. PDF del RIDE guardados: ahora se generan al momento
  if (accion === 'borrar_ride') {
    const r = await sql`update documentos_electronicos set ride = null where ride is not null`;
    return NextResponse.json({ borrados: r.count });
  }

  // 3. Comprimir el XML autorizado de mas de 2 años, por lotes, hasta ~240 s
  if (accion === 'comprimir') {
    let hechos = 0, antes = 0, despues = 0;
    while (Date.now() - t0 < 240_000) {
      const filas = await sql<{ id: number; x: string }[]>`
        select id, xml_retornado::text x from documentos_electronicos
        where xml_retornado is not null and fecha_modificacion < (now() at time zone 'America/Guayaquil') - interval '2 years'
        order by id limit 200`;
      if (!filas.length) break;
      for (const f of filas) {
        const gz = comprimirXml(f.x); // falla si no se recupera identico: entonces no se toca la fila
        await sql`update documentos_electronicos set xml_retornado_gz = ${gz}, xml_retornado = null where id = ${f.id} and xml_retornado is not null`;
        hechos++; antes += Buffer.byteLength(f.x, 'utf8'); despues += gz.length;
      }
    }
    const [q] = await sql`select count(*)::int quedan from documentos_electronicos
      where xml_retornado is not null and fecha_modificacion < (now() at time zone 'America/Guayaquil') - interval '2 years'`;
    return NextResponse.json({ comprimidos: hechos, mb_antes: +(antes / 1048576).toFixed(1), mb_despues: +(despues / 1048576).toFixed(1), quedan: q.quedan, segundos: Math.round((Date.now() - t0) / 1000) });
  }

  // comprobacion: descomprime una muestra y la compara con lo que habia en el respaldo no es posible aqui; verifica que descomprime
  if (accion === 'verificar') {
    const { xmlAutorizado } = await import('@/lib/comprobantes/xmlGuardado');
    const filas = await sql<{ id: number; gz: Uint8Array }[]>`select id, xml_retornado_gz gz from documentos_electronicos where xml_retornado_gz is not null order by random() limit 300`;
    let ok = 0; const malos: number[] = [];
    for (const f of filas) {
      const x = xmlAutorizado(null, f.gz);
      if (x && x.includes('<') && /autorizacion|comprobante/i.test(x)) ok++; else malos.push(f.id);
    }
    return NextResponse.json({ revisados: filas.length, ok, malos });
  }

  return NextResponse.json({ error: 'accion: estado | vaciar_generado | borrar_ride | comprimir | verificar' }, { status: 400 });
}
