import 'server-only';
import { sql } from '@/lib/db';

export const RUTAS: Record<number, [string, string]> = {
  1: ['/facturas', 'Factura'], 2: ['/liquidaciones', 'Liquidación de compra'], 3: ['/notas-credito', 'Nota de crédito'],
  4: ['/notas-debito', 'Nota de débito'], 5: ['/guias-remision', 'Guía de remisión'], 6: ['/retenciones', 'Retención'],
};

/** Comprobantes del emisor por tipo: (tipo, id, numero, fecha, estado) */
export function unionComprobantes(emisorId: number) {
  return sql`
    select 1 tipo, id, numero, fecha_emision fecha, estado from factura where id_emisor = ${emisorId}
    union all select 2, id, numero, fecha_emision, estado from liquidacion_compra where id_emisor = ${emisorId}
    union all select 3, id, numero, fecha_emision, estado from nota_credito where id_emisor = ${emisorId}
    union all select 4, id, numero, fecha_emision, estado from nota_debito where id_emisior = ${emisorId}
    union all select 5, id, numero_comprobante, fecha_inicio_transporte, estado from guia_remision where id_emisor = ${emisorId}
    union all select 6, id, numero, fecha_emision, estado from retencion where id_emisor = ${emisorId}`;
}

export type Problema = { tipo: number; id: number; numero: string; fecha: Date; estado: number; mensajes: string | null; en_cola: boolean };

/** Comprobantes finalizados sin autorizar: finalizado (3), recibido (4), no recibido (5), no autorizado (7) */
export async function comprobantesConProblemas(emisorId: number): Promise<Problema[]> {
  return sql<Problema[]>`
    with c as (${unionComprobantes(emisorId)})
    select c.tipo, c.id, c.numero, c.fecha, c.estado,
      (select d.mensajes from documentos_electronicos d where d.id_tipo_comprobante = c.tipo and d.id_comprobante = c.id order by d.id desc limit 1) mensajes,
      exists (select 1 from cola_envio_comprobantes q where q.id_tipo_comprobante = c.tipo and q.id_comprobante = c.id) en_cola
    from c
    where c.estado in (3, 4, 5, 7) and coalesce(c.numero, '') <> ''
    order by c.fecha desc, c.id desc
    limit 300`;
}

/** Entradas de la cola de envio que pertenecen al emisor */
export async function colaDelEmisor(emisorId: number) {
  return sql<{ tipo: number; id: number }[]>`
    with c as (${unionComprobantes(emisorId)})
    select q.id_tipo_comprobante tipo, q.id_comprobante id
    from cola_envio_comprobantes q join c on c.tipo = q.id_tipo_comprobante and c.id = q.id_comprobante
    order by q.id_documento_electronico`;
}
