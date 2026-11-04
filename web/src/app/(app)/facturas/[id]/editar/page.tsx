import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarFactura } from '@/lib/comprobantes/factura';
import { emisionPermitida } from '@/lib/comprobantes/procesar';
import { puntosEmision, formasPago } from '@/lib/catalogos';
import { fechaInput } from '@/lib/formato';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { Totales } from '@/components/comprobante/Totales';
import { ESTADO, TIEMPOS_PAGO, ID_CONSUMIDOR_FINAL, MONTO_MAXIMO_CONSUMIDOR_FINAL } from '@/lib/constantes';
import { money } from '@/lib/formato';
import { DatosFactura, ClienteFactura, LineasFactura, PagosFactura, AdicionalesFactura, BotonesFactura } from './Editor';

export default async function EditarFactura({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql<{ estado: number }[]>`select estado from factura where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  if (ok.estado !== ESTADO.PENDIENTE && ok.estado !== ESTADO.PAGADO) redirect(`/facturas/${id}`);
  const [{ f, detalles, pagos, adicionales }, puntos, formas, perm] = await Promise.all([
    cargarFactura(id), puntosEmision(s.emisorId), formasPago(), emisionPermitida(s.emisorId),
  ]);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string }[]>`select nombre_cliente, identificacion from clientes where id = ${f.id_cliente}`;
  const sumaPagos = pagos.reduce((a, p) => a + Number(p.valor), 0);
  const total = Number(f.total);
  const pendiente = Math.round((total - sumaPagos) * 100) / 100;
  const esCF = f.id_cliente === ID_CONSUMIDOR_FINAL;
  const requisitos = [
    { ok: !!f.id_cliente, texto: esCF ? 'Cliente: Consumidor final' : `Cliente: ${c?.nombre_cliente ?? '—'}` },
    { ok: detalles.length > 0, texto: detalles.length ? `${detalles.length} producto(s) · total $${money(total)}` : 'Agregue al menos un producto' },
    {
      ok: pagos.length > 0 && Math.abs(pendiente) < 0.01,
      texto: !pagos.length ? 'Agregue la forma de pago' : Math.abs(pendiente) < 0.01 ? 'Forma de pago completa'
        : pendiente > 0 ? `Falta asignar $${money(pendiente)} en formas de pago` : `Los pagos superan el total en $${money(-pendiente)}`,
    },
    ...(esCF ? [{ ok: total <= MONTO_MAXIMO_CONSUMIDOR_FINAL, texto: total <= MONTO_MAXIMO_CONSUMIDOR_FINAL
      ? `Consumidor final: dentro del máximo de $${MONTO_MAXIMO_CONSUMIDOR_FINAL}` : `Consumidor final no puede superar $${MONTO_MAXIMO_CONSUMIDOR_FINAL}: elija un cliente con identificación` }] : []),
  ];
  return (
    <>
      <Cabecera titulo={`Factura · borrador #${f.id}`} sub={<><Estado id={f.estado} /> <span className="muted">· Todo se guarda al momento. Cuando la lista de abajo esté en ✓, emita la factura.</span></>}>
        <Link className="btn" href="/facturas">Volver</Link>
      </Cabecera>
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      <DatosFactura id={id} puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
        valores={{ id_punto_emision: f.id_punto_emison, fecha: fechaInput(f.fecha_emision), guia: f.guia_de_remision ?? '' }} />
      <ClienteFactura id={id} cliente={{ id: f.id_cliente, nombre: c.nombre_cliente, identificacion: c.identificacion }} />
      <LineasFactura id={id} lineas={detalles.map((d) => ({
        id: d.id, codigo: d.codigo, nombre: d.nombre, adicional: d.adicional, cantidad: Number(d.cantidad),
        pvp: Math.round(Number(d.precio_unitario) * (1 + Number(d.iva_pct) / 100) * 100) / 100,
        descuento_pct: Number(d.decuento_porcentaje ?? 0),
        sub_total: Number(d.sub_total), valor_iva: Number(d.valor_iva), total: Number(d.total),
      }))} />
      <div className="grid c2" style={{ marginBottom: 16 }}>
        <PagosFactura id={id} formas={formas.map((x) => ({ id: x.id, texto: `${x.codigo} · ${x.descripcion_form_pago}` }))} tiempos={TIEMPOS_PAGO}
          pagos={pagos.map((p) => ({ id: p.id, texto: p.descripcion, valor: Number(p.valor), plazo: p.plazo, tiempo: p.timpo }))}
          pendiente={pendiente} />
        <AdicionalesFactura id={id} adicionales={adicionales} />
      </div>
      <div className="grid c2">
        <Totales f={f} />
        <BotonesFactura id={id} permitido={perm.permitido} requisitos={requisitos} />
      </div>
    </>
  );
}
