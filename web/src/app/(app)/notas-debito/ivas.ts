import 'server-only';
import { sql } from '@/lib/db';

/** Tarifas de IVA disponibles para la nota de debito */
export async function tarifasIva() {
  return sql<{ id: number; descripcion: string; porcentaje: number }[]>`
    select id, descripcion, porcentaje from porcentaje_impuesto_producto where id_impuesto in (1, 4) order by porcentaje desc, id`;
}
