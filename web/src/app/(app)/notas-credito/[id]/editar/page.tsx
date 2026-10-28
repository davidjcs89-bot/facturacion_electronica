import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarNotaCredito, lineasFacturaOrigen } from '@/lib/comprobantes/nota_credito';
import { emisionPermitida } from '@/lib/comprobantes/procesar';
import { puntosEmision } from '@/lib/catalogos';
import { fechaInput, fecha, money, money3 } from '@/lib/formato';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { Totales } from '@/components/comprobante/Totales';
import { ESTADO } from '@/lib/constantes';
import { CabeceraNC, LineasNC, AdicionalesNC, BotonesNC } from './Editor';

export default async function EditarNotaCredito({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql<{ estado: number }[]>`select estado from nota_credito where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  if (ok.estado !== ESTADO.PENDIENTE && ok.estado !== ESTADO.PAGADO) redirect(`/notas-credito/${id}`);
  const { n, detalles, adicionales } = await cargarNotaCredito(id);
  const [origen, puntos, perm] = await Promise.all([lineasFacturaOrigen(n.id_factura_devolver, id), puntosEmision(s.emisorId), emisionPermitida(s.emisorId)]);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string }[]>`select nombre_cliente, identificacion from clientes where id = ${n.id_cliente}`;
  const [f] = await sql<{ total: number; otras: number }[]>`
    select f.total, coalesce((select sum(total) from nota_credito o where o.id_factura_devolver = f.id and o.id <> ${id} and o.estado not in (7, 8)), 0) otras
    from factura f where f.id = ${n.id_factura_devolver}`;
  const saldo = Number(f.total) - Number(f.otras);
  return (
    <>
      <Cabecera titulo={`Nota de crédito · borrador #${n.id}`} sub={<>Factura <Link href={`/facturas/${n.id_factura_devolver}`}>{n.numero_fc_mod}</Link> del {fecha(n.fecha_emision_fc_mod)} · {c.nombre_cliente} ({c.identificacion}) · <Estado id={n.estado} /></>}>
        <Link className="btn" href="/notas-credito">Volver</Link>
      </Cabecera>
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      {Number(n.total) - saldo > 0.009 && <Alerta tipo="error">El total de la nota (${money(n.total)}) supera el saldo de la factura (${money(saldo)}).</Alerta>}
      <CabeceraNC id={id} puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
        valores={{ id_punto_emision: n.id_punto_emision, fecha: fechaInput(n.fecha_emision), motivo: n.motivo === '.' ? '' : n.motivo }} />
      <LineasNC id={id}
        lineas={detalles.map((d) => ({ id: d.id, id_producto: d.id_producto, codigo: d.codigo, nombre: d.nombre, cantidad: Number(d.cantidad), precio: money3(d.precio), descuento: money(d.descuento), subtotal: money(d.subtotal), iva: money(d.valor_iva), total: money(d.total) }))}
        origen={origen.map((o) => ({ id: o.id, id_producto: o.id_producto, texto: `${o.codigo} · ${o.nombre.trim().toUpperCase() === 'REFERENCIA' && o.adicional ? o.adicional : o.nombre}`, disponible: Number(o.cantidad) - Number(o.acreditado) }))} />
      <div className="grid c2">
        <AdicionalesNC id={id} adicionales={adicionales} />
        <div>
          <Totales f={{ ...n, subtotal_sin_impuestos: n.sumtota_sin_impuesto }} />
          <p className="muted">Saldo disponible de la factura: ${money(saldo)}</p>
          <BotonesNC id={id} permitido={perm.permitido} />
        </div>
      </div>
    </>
  );
}
