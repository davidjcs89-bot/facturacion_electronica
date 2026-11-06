import 'server-only';
import { sql } from './db';

export async function tiposIdentificacion() {
  return sql<{ id: number; descripcion: string; codigo: string }[]>`select id, descripcion, codigo from tipo_identificacion order by id`;
}
export async function tiposCliente() {
  return sql<{ id: number; descripcion: string; codigo: string }[]>`select id, descripcion, codigo from tipo_cliente order by id`;
}
export async function formasPago() {
  return sql<{ id: number; codigo: string; descripcion_form_pago: string }[]>`select id, codigo, descripcion_form_pago from formas_de_pago order by id`;
}
export type PuntoEmision = {
  id: number; numero_establecimiento: string; numero_emision: string; direccion: string; id_bodega: number;
  /** '1' PRUEBAS / '2' PRODUCCION si el punto es exclusivo de esta app; null si es un punto del sistema anterior */
  ambiente: string | null;
};

/**
 * Puntos de emision que puede usar esta app. Si el emisor tiene puntos exclusivos de la app (tabla
 * punto_emision_app), solo se ofrecen esos: los del sistema anterior quedan para el sistema anterior.
 */
export async function puntosEmision(emisorId: number) {
  const todos = await sql<PuntoEmision[]>`
    select p.id, p.numero_establecimiento, p.numero_emision, p.direccion, p.id_bodega, a.ambiente
    from puntos_emisior p left join punto_emision_app a on a.id_punto = p.id
    where p.id_emisor = ${emisorId}
    order by (a.ambiente = '1') nulls last, p.numero_establecimiento, p.numero_emision`;
  const propios = todos.filter((p) => p.ambiente);
  return propios.length ? propios : todos;
}

/** Texto del punto para las listas: «001-010 · PRODUCCIÓN» o «001-001 · direccion» */
export function textoPunto(p: Pick<PuntoEmision, 'numero_establecimiento' | 'numero_emision' | 'direccion' | 'ambiente'>) {
  const serie = `${p.numero_establecimiento}-${p.numero_emision}`;
  if (p.ambiente === '1') return `${serie} · PRUEBAS`;
  if (p.ambiente === '2') return `${serie} · PRODUCCIÓN`;
  return `${serie} · ${p.direccion}`;
}

/**
 * Proximo numero que tomara cada punto para un tipo de comprobante (1 factura, 2 liquidacion, 3 nota de credito,
 * 4 nota de debito, 5 guia, 6 retencion). Ej.: { 95: '001-010-000000001 · PRODUCCIÓN' }
 */
export async function proximosNumeros(emisorId: number, tipoDoc: number): Promise<Record<number, string>> {
  const filas = await sql<{ id: number; estab: string; pto: string; secuencial: number | null; ambiente: string | null; amb_emisor: string }[]>`
    select p.id, p.numero_establecimiento estab, p.numero_emision pto, s.secuencial, a.ambiente, ta.codigo_ambiente amb_emisor
    from puntos_emisior p
    join emisor e on e.id = p.id_emisor
    join tipo_ambientes ta on ta.id = e.tipo_ambiente
    left join secuencias s on s.id_punto_emision = p.id and s.id_documentos = ${tipoDoc}
    left join punto_emision_app a on a.id_punto = p.id
    where p.id_emisor = ${emisorId}`;
  const r: Record<number, string> = {};
  for (const f of filas) {
    const amb = (f.ambiente ?? f.amb_emisor) === '2' ? 'PRODUCCIÓN' : 'PRUEBAS';
    r[f.id] = f.secuencial == null
      ? `${f.estab}-${f.pto} · sin secuencial configurado`
      : `${f.estab.padStart(3, '0')}-${f.pto.padStart(3, '0')}-${String(f.secuencial).padStart(9, '0')} · ${amb}`;
  }
  return r;
}

export async function bodegas(emisorId: number) {
  return sql<{ id: number; codigo: string; nombre: string; activa: boolean }[]>`
    select id, codigo, nombre, activa from bodegas where id_emisor = ${emisorId} order by nombre`;
}
