import 'server-only';
import { sql } from '@/lib/db';

export type Opcion = { id: number; descripcion: string; porcentaje: number };

/** Opciones de impuestos para el formulario de producto */
export async function opcionesImpuestos() {
  type Fila = { id: number; id_impuesto: number; descripcion: string; codigo: string; porcentaje: number };
  const filas: Fila[] = await sql<Fila[]>`
    select id, id_impuesto, replace(descripcion, E'\r', '') descripcion, codigo, porcentaje
    from porcentaje_impuesto_producto order by id_impuesto, porcentaje, descripcion`;
  const iva = filas.filter((f) => f.id_impuesto === 1 || f.id_impuesto === 4).sort((a, b) => b.porcentaje - a.porcentaje || a.id - b.id);
  const ice = filas.filter((f) => f.id_impuesto === 2).sort((a, b) => (a.id === 99 ? -1 : b.id === 99 ? 1 : a.descripcion.localeCompare(b.descripcion)));
  const irbpnr = filas.filter((f) => f.id_impuesto === 3).sort((a, b) => (a.id === 100 ? -1 : b.id === 100 ? 1 : 0));
  const tipos = await sql<{ id: number; descripcion: string }[]>`select id, descripcion from tipo_producto order by id`;
  const m = (x: Fila[]) => x.map((f) => ({ id: f.id, descripcion: f.id_impuesto === 2 && f.id !== 99 ? `${f.codigo} · ${f.descripcion}` : f.descripcion, porcentaje: Number(f.porcentaje) }));
  return { iva: m(iva), ice: m(ice), irbpnr: m(irbpnr), tipos };
}
