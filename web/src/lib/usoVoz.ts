import 'server-only';
import { sql } from './db';

/** Anota un uso de la factura por voz para el panel de salud (si falla, no interrumpe nada) */
export async function registrarUsoVoz(u: { emisor: number | null; tipo: 'audio' | 'claude' | 'factura'; entrada?: number | null; salida?: number | null; restantes?: number | null }) {
  try {
    await sql`insert into uso_voz (id_emisor, tipo, tokens_entrada, tokens_salida, restantes_dia)
      values (${u.emisor}, ${u.tipo}, ${u.entrada ?? null}, ${u.salida ?? null}, ${u.restantes ?? null})`;
  } catch { /* sin registro */ }
}
