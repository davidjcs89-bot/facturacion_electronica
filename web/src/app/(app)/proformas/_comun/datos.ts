import 'server-only';
import { sql } from '@/lib/db';
import { PROFORMA, PEDIDO, lineasDoc } from './lineas';
import { pdfDocumento } from './pdf';

function totalesDe(d: Record<string, number>, colSub: string): [string, number][] {
  const filas: [string, number][] = [
    ['Subtotal con IVA', Number(d.subtotal_iva)],
    ['Subtotal 0%', Number(d.subtotal_iva_cero)],
    ['Subtotal sin impuestos', Number(d[colSub])],
    ['Descuento', Number(d.total_descuento)],
    ['IVA', Number(d.valor_iva)],
    ['ICE', Number(d.valor_ice)],
  ];
  return [...filas.filter(([k, v]) => v !== 0 || k === 'IVA' || k === 'Subtotal sin impuestos'), ['TOTAL', Number(d.total)]];
}

export async function generarPdfProforma(id: number, emisorId: number) {
  const [p] = await sql`select p.*, e.nombre_comercial, c.nombre_cliente from proforma p join emisor e on e.id = p.id_emisor
    join clientes c on c.id = p.id_cliente where p.id = ${id} and p.id_emisor = ${emisorId}`;
  if (!p) throw new Error('Proforma no encontrada');
  const lineas = await lineasDoc(PROFORMA, id);
  const obs = String(p.observaiones ?? '').trim();
  const pdf = await pdfDocumento({
    titulo: 'PROFORMA', numero: String(p.numero), fecha: p.fecha_emision, emisorId, idCliente: p.id_cliente, lineas,
    totales: totalesDe(p, 'subtotal_sin_impuesto'), notas: obs ? [['Observaciones', obs]] : [],
  });
  return { pdf, numero: String(p.numero), emisor: p.nombre_comercial as string, cliente: p.nombre_cliente as string, total: Number(p.total) };
}

export async function generarPdfPedido(id: number, emisorId: number) {
  const [p] = await sql`select p.*, e.nombre_comercial, c.nombre_cliente,
      (select coalesce(sum(valor), 0) from abonos_pedido where id_pedido = p.id) abonado
    from pedido p join emisor e on e.id = p.id_emisor join clientes c on c.id = p.id_cliente
    where p.id = ${id} and p.id_emisor = ${emisorId}`;
  if (!p) throw new Error('Pedido no encontrado');
  const lineas = await lineasDoc(PEDIDO, id);
  const totales = totalesDe(p, 'subtotal_sin_impuestos');
  totales.push(['Abonado', Number(p.abonado)], ['Saldo', Number(p.total) - Number(p.abonado)]);
  const pdf = await pdfDocumento({
    titulo: 'PEDIDO', numero: String(p.numero), fecha: p.fecha_creacion, emisorId, idCliente: p.id_cliente, lineas, totales,
  });
  return { pdf, numero: String(p.numero), emisor: p.nombre_comercial as string, cliente: p.nombre_cliente as string, total: Number(p.total) };
}
