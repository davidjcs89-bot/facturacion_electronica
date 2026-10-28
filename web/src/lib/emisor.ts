import 'server-only';
import { sql } from './db';

export type EmisorResumen = {
  id: number; ruc: string; razon_social: string; nombre_comercial: string; tipo_ambiente: number; ambiente: string;
};

export async function emisorResumen(id: number | null): Promise<EmisorResumen | null> {
  if (!id) return null;
  const r = await sql<EmisorResumen[]>`
    select e.id, e.ruc, e.razon_social, e.nombre_comercial, e.tipo_ambiente, a.descripcion_ambiente as ambiente
    from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente
    where e.id = ${id}`;
  return r[0] ?? null;
}
