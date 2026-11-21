import 'server-only';
import { sql } from './db';
import { manejador } from './comprobantes/registro';
import { TIPOS_REVISION } from './revision';

/** Límites de los planes gratis (revisar si cambian) */
export const LIMITES = {
  baseMB: 500,          // Supabase gratis
  conexiones: 60,       // Supabase gratis (conexión directa)
  gmailDia: 500,        // Gmail personal, aprox.
  groqDia: 2000,        // Groq gratis, whisper-large-v3-turbo
};
/** Claude Haiku 5.5, USD por millón de tokens (prompts de hasta 100K) */
const PRECIO_CLAUDE = { entrada: 0.10, salida: 0.50 };
export const ALERTA_PCT = 80;
export const AVISO_PCT = 60;

export type Alerta = { texto: string; nivel: 'rojo' | 'ambar' };

export async function datosSalud() {
  const hoy = sql`(now() at time zone 'America/Guayaquil')::date`;

  const baseQ = sql<{ mb: number; conexiones: number }[]>`
    select round(pg_database_size(current_database()) / 1048576.0)::int mb,
      (select count(*) from pg_stat_activity where datname = current_database())::int conexiones`;
  const tablasQ = sql<{ tabla: string; mb: number }[]>`
    select relname tabla, round(pg_total_relation_size(relid) / 1048576.0, 1)::float mb
    from pg_stat_user_tables order by pg_total_relation_size(relid) desc limit 3`;

  const correosQ = sql<{ sistema: number; empresa: number; fallidos: number }[]>`
    select
      count(*) filter (where via_sistema and id_tipo_comprobante is null and fecha::date = ${hoy})::int sistema,
      count(*) filter (where not via_sistema and id_tipo_comprobante is not null and ok and fecha::date = ${hoy})::int empresa,
      (select count(*) from (
         select distinct e1.id_tipo_comprobante, e1.id_comprobante from envio_correo e1
         where not e1.ok and e1.id_tipo_comprobante is not null
           and e1.fecha >= (now() at time zone 'America/Guayaquil') - interval '7 days'
           and not exists (select 1 from envio_correo e2 where e2.id_tipo_comprobante = e1.id_tipo_comprobante
             and e2.id_comprobante = e1.id_comprobante and e2.ok and e2.fecha > e1.fecha)) t)::int fallidos
    from envio_correo where fecha >= (now() at time zone 'America/Guayaquil') - interval '7 days'`
    .catch(() => [{ sistema: 0, empresa: 0, fallidos: 0 }]);

  // SRI: comprobantes de hoy de todas las empresas
  const partes = TIPOS_REVISION.map((t) => {
    const m = manejador(t);
    return sql`select x.estado, x.fecha_autorizacion fa from ${sql(m.tabla)} x
      where x.${sql(m.colFecha)}::date = ${hoy} or x.fecha_autorizacion >= now() - interval '2 days'`;
  });
  const union = partes.reduce((a, b) => sql`${a} union all ${b}`);
  const sriQ = sql<{ rechazados: number; en_proceso: number; sin_respuesta: number; ultimo: Date | null }[]>`
    select count(*) filter (where estado in (5, 7))::int rechazados,
      count(*) filter (where estado in (4))::int en_proceso,
      count(*) filter (where estado in (3))::int sin_respuesta,
      max(fa) ultimo
    from (${union}) u`;
  const firmasQ = sql<{ empresa: string; vence: Date; dias: number }[]>`
    select coalesce(nullif(e.nombre_comercial, ''), e.razon_social) empresa, f.valido_hasta vence,
      (f.valido_hasta::date - ${hoy})::int dias
    from firma_emisor f join emisor e on e.id = f.id_emisor
    where f.valido_hasta::date between ${hoy} - 30 and ${hoy} + 30
      -- solo empresas que facturan (autorizada en los últimos 90 días); las inactivas no generan alerta
      and exists (select 1 from factura x where x.id_emisor = e.id and x.estado = 6 and x.fecha_emision >= now() - interval '90 days')
    order by f.valido_hasta limit 10`;

  const vozQ = sql<{ audios_hoy: number; restantes: number | null; facturas_mes: number; tok_in: number; tok_out: number }[]>`
    select count(*) filter (where tipo = 'audio' and fecha::date = ${hoy})::int audios_hoy,
      (select restantes_dia from uso_voz where tipo = 'audio' and fecha::date = ${hoy} and restantes_dia is not null order by id desc limit 1) restantes,
      count(*) filter (where tipo = 'factura')::int facturas_mes,
      coalesce(sum(tokens_entrada) filter (where tipo = 'claude'), 0)::float tok_in,
      coalesce(sum(tokens_salida) filter (where tipo = 'claude'), 0)::float tok_out
    from uso_voz where fecha >= date_trunc('month', now() at time zone 'America/Guayaquil')`
    .catch(() => [{ audios_hoy: 0, restantes: null, facturas_mes: 0, tok_in: 0, tok_out: 0 }]);

  const [[base], tablas, [correos], [sri], firmas, [voz]] = await Promise.all([baseQ, tablasQ, correosQ, sriQ, firmasQ, vozQ]);

  // Groq dice cuántas solicitudes quedan hoy: lo usado es el límite menos eso (más exacto que contar)
  const audiosUsados = voz.restantes != null ? Math.max(LIMITES.groqDia - voz.restantes, voz.audios_hoy) : voz.audios_hoy;
  const claudeUSD = (voz.tok_in * PRECIO_CLAUDE.entrada + voz.tok_out * PRECIO_CLAUDE.salida) / 1_000_000;

  const pct = (u: number, t: number) => Math.round((u / t) * 100);
  const medidas = {
    base: pct(base.mb, LIMITES.baseMB),
    conexiones: pct(base.conexiones, LIMITES.conexiones),
    gmail: pct(correos.sistema, LIMITES.gmailDia),
    groq: pct(audiosUsados, LIMITES.groqDia),
  };

  const alertas: Alerta[] = [];
  const nivel = (p: number) => (p >= ALERTA_PCT ? 'rojo' : 'ambar') as Alerta['nivel'];
  if (medidas.base >= AVISO_PCT) alertas.push({ texto: `base de datos al ${medidas.base} %`, nivel: nivel(medidas.base) });
  if (medidas.conexiones >= AVISO_PCT) alertas.push({ texto: `conexiones al ${medidas.conexiones} %`, nivel: nivel(medidas.conexiones) });
  if (medidas.gmail >= AVISO_PCT) alertas.push({ texto: `correo del sistema al ${medidas.gmail} %`, nivel: nivel(medidas.gmail) });
  if (medidas.groq >= AVISO_PCT) alertas.push({ texto: `audios de voz al ${medidas.groq} %`, nivel: nivel(medidas.groq) });
  if (sri.rechazados) alertas.push({ texto: `${sri.rechazados} rechazado${sri.rechazados === 1 ? '' : 's'} por el SRI hoy`, nivel: 'rojo' });
  if (sri.sin_respuesta) alertas.push({ texto: `${sri.sin_respuesta} sin respuesta del SRI hoy`, nivel: 'ambar' });
  if (correos.fallidos) alertas.push({ texto: `${correos.fallidos} correo${correos.fallidos === 1 ? '' : 's'} fallido${correos.fallidos === 1 ? '' : 's'} (7 días)`, nivel: 'ambar' });
  const vencidas = firmas.filter((f) => f.dias <= 15).length;
  if (vencidas) alertas.push({ texto: `${vencidas} firma${vencidas === 1 ? '' : 's'} vence${vencidas === 1 ? '' : 'n'} en 15 días o menos`, nivel: 'rojo' });

  return { base, tablas, correos, sri, firmas, voz: { ...voz, audiosUsados, claudeUSD }, medidas, alertas };
}

/** Solo las alertas en rojo, para el Inicio del administrador */
export async function alertasSalud(): Promise<Alerta[]> {
  try {
    return (await datosSalud()).alertas.filter((a) => a.nivel === 'rojo');
  } catch {
    return [];
  }
}
