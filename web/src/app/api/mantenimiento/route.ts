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

  if (accion === 'puntos') {
    const e = Number(req.nextUrl.searchParams.get('emisor'));
    const r = await sql`select p.id, p.numero_establecimiento estab, p.numero_emision pto, p.id_bodega, a.ambiente app,
        (select count(*) from factura f where f.id_punto_emison = p.id and f.fecha_emision >= now() - interval '90 days')::int fact90,
        (select json_agg(json_build_object('t', s.id_documentos, 's', s.secuencial)) from secuencias s where s.id_punto_emision = p.id) sec
      from puntos_emisior p left join punto_emision_app a on a.id_punto = p.id where p.id_emisor = ${e} order by p.id`;
    const [em] = await sql`select e.id, e.razon_social, e.nombre_comercial, t.codigo_ambiente amb from emisor e join tipo_ambientes t on t.id = e.tipo_ambiente where e.id = ${e}`;
    return NextResponse.json({ em, puntos: r });
  }
  if (accion === 'crear_pruebas') {
    // Victoria Jervis (52): su punto real 001-001 queda en PRODUCCION y se agrega 001-099 en PRUEBAS (aprobado por David)
    const e = Number(req.nextUrl.searchParams.get('emisor'));
    if (e !== 52) return NextResponse.json({ error: 'solo emisor 52' }, { status: 400 });
    const out = await sql.begin(async (tx) => {
      const [real] = await tx<{ id: number; id_bodega: number; direccion: string; estab: string }[]>`
        select id, id_bodega, direccion, numero_establecimiento estab from puntos_emisior where id_emisor = ${e} and numero_emision = '001' order by id limit 1`;
      if (!real) throw new Error('sin punto 001');
      await tx`insert into punto_emision_app (id_punto, ambiente) values (${real.id}, '2') on conflict (id_punto) do update set ambiente = '2'`;
      let [pr] = await tx<{ id: number }[]>`select id from puntos_emisior where id_emisor = ${e} and numero_establecimiento = ${real.estab} and numero_emision = '099'`;
      if (!pr) {
        [pr] = await tx<{ id: number }[]>`insert into puntos_emisior (id_emisor, numero_establecimiento, numero_emision, direccion, id_bodega)
          values (${e}, ${real.estab}, '099', ${real.direccion}, ${real.id_bodega}) returning id`;
      }
      for (const t of [1, 2, 3, 4, 5, 6]) {
        const r = await tx`select 1 from secuencias where id_punto_emision = ${pr.id} and id_documentos = ${t}`;
        if (!r.length) await tx`insert into secuencias (id_punto_emision, id_documentos, secuencial) values (${pr.id}, ${t}, 1)`;
      }
      await tx`insert into punto_emision_app (id_punto, ambiente) values (${pr.id}, '1') on conflict (id_punto) do update set ambiente = '1'`;
      await tx`update emisor set id_punto_defecto = ${real.id} where id = ${e}`;
      return { real: real.id, pruebas: pr.id };
    });
    return NextResponse.json(out);
  }
  if (accion === 'claude') {
    // comprueba la clave sin gastar: lista de modelos (no muestra la clave)
    const k = process.env.ANTHROPIC_API_KEY ?? '';
    if (!k) return NextResponse.json({ clave: 'no configurada' });
    const r = await fetch('https://api.anthropic.com/v1/models?limit=5', { headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' } });
    const j = (await r.json().catch(() => ({}))) as { data?: { id: string }[]; error?: { type: string; message: string } };
    return NextResponse.json({ http: r.status, formato_ok: k.startsWith('sk-ant-'), largo: k.length, modelos: j.data?.map((m) => m.id), error: j.error });
  }
  if (accion === 'correos') {
    const r = await sql`select id, servidor, puerto, split_part(direccion, '@', 2) dominio, left(direccion, 3) || '…' inicio from cuentas_correo order by id`;
    return NextResponse.json(r);
  }
  if (accion === 'columnas') {
    const r = await sql`select table_schema, column_name, data_type, is_nullable from information_schema.columns
      where table_name = 'documentos_electronicos' order by table_schema, ordinal_position`;
    const [u] = await sql`select current_database() db, current_user u, current_setting('search_path') sp`;
    return NextResponse.json({ u, r });
  }
  if (accion === 'estado') {
    const [r] = await sql`select
      count(*) filter (where xml_generado is not null and xml_generado::text <> '' and (xml_retornado is not null or xml_retornado_gz is not null))::int generado_por_vaciar,
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
    // la columna no admite null: se deja vacía (mismo ahorro de espacio)
    const r = await sql`update documentos_electronicos set xml_generado = ''::xml
      where xml_generado is not null and xml_generado::text <> '' and (xml_retornado is not null or xml_retornado_gz is not null)`;
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
