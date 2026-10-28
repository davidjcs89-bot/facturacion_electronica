import 'server-only';
import { sql } from '@/lib/db';

export async function datosFormulario(emisorId: number, idPunto: number | null) {
  const bodegas = await sql<{ id: number; nombre: string }[]>`select id, nombre from bodegas where id_emisor = ${emisorId} order by nombre`;
  const tipos = await sql<{ id: number; descripcion: string; codigo: string; secuencial: number }[]>`
    select t.id, t.descripcion_doc descripcion, t.codigo_doc codigo,
      coalesce((select s.secuencial from secuencias s where s.id_punto_emision = ${idPunto ?? 0} and s.id_documentos = t.id order by s.id limit 1), 1) secuencial
    from tipo_documento t order by t.id`;
  return { bodegas, tipos };
}
