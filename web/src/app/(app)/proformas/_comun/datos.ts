import 'server-only';
import { sql } from '@/lib/db';
import { PROFORMA, PEDIDO, lineasDoc } from './lineas';
import { pdfDocumento } from './pdf';
import { datosEmisor, clienteXml, emisorRide } from '@/lib/comprobantes/comun';
import { money, money3, fecha } from '@/lib/formato';
import type { ModeloRide } from '@/lib/sri/ride';

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

/** Modelo (mismo formato del RIDE) para imprimir una proforma o un pedido en ticket */
export async function modeloTicketDoc(tipo: 'proforma' | 'pedido', id: number, emisorId: number): Promise<ModeloRide> {
  const c = tipo === 'proforma' ? PROFORMA : PEDIDO;
  const [p] = await sql`select x.*, ${tipo === 'pedido' ? sql`(select coalesce(sum(valor), 0) from abonos_pedido where id_pedido = x.id)` : sql`0`} abonado
    from ${sql(c.tabla)} x where x.id = ${id} and x.id_emisor = ${emisorId}`;
  if (!p) throw new Error('Documento no encontrado');
  const e = await datosEmisor(emisorId);
  const cli = await clienteXml(p.id_cliente);
  const lineas = await lineasDoc(c, id);
  const totales = totalesDe(p, c.colSubtotal);
  if (tipo === 'pedido') totales.push(['Abonado', Number(p.abonado)], ['Saldo', Number(p.total) - Number(p.abonado)]);
  const obs = String(p.observaiones ?? '').trim();
  return {
    titulo: tipo === 'proforma' ? 'PROFORMA' : 'PEDIDO',
    numero: String(p.numero),
    claveAcceso: '',
    ambiente: '',
    emisor: emisorRide(e, null),
    receptor: [
      ['Cliente', cli.nombre_cliente],
      ['Identificación', cli.identificacion],
      ['Fecha', fecha(tipo === 'proforma' ? p.fecha_emision : p.fecha_creacion)],
      ['Dirección', cli.direccion || ''],
    ],
    tablas: [
      {
        columnas: [
          { titulo: 'Cod. Principal', ancho: 1 },
          { titulo: 'Cant.', ancho: 1 },
          { titulo: 'Descripción', ancho: 1 },
          { titulo: 'Detalle Adicional', ancho: 1 },
          { titulo: 'Precio Unitario', ancho: 1 },
          { titulo: 'Descuento', ancho: 1 },
          { titulo: 'Precio Total', ancho: 1 },
        ],
        filas: lineas.map((l) => [l.codigo, String(Number(l.cantidad)), l.nombre, l.adicional ?? '', money3(l.precio_unitario), money(l.descuento), money(l.sub_total)]),
      },
    ],
    adicionales: tipo === 'proforma' && obs ? [['Observaciones', obs]] : [],
    totales: totales.map(([k, v]) => [k.toUpperCase(), money(v)] as [string, string]),
  };
}
