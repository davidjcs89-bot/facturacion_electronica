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
import { ESTADO, TIEMPOS_PAGO } from '@/lib/constantes';
import { CabeceraFactura, LineasFactura, PagosFactura, AdicionalesFactura, BotonesFactura } from './Editor';

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
  return (
    <>
      <Cabecera titulo={`Factura · borrador #${f.id}`} sub={<Estado id={f.estado} />}>
        <Link className="btn" href="/facturas">Volver</Link>
      </Cabecera>
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      <CabeceraFactura id={id} puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
        valores={{ id_punto_emision: f.id_punto_emison, fecha: fechaInput(f.fecha_emision), guia: f.guia_de_remision ?? '', mayorista: f.es_mayorista,
          cliente: { id: f.id_cliente, nombre: c.nombre_cliente, identificacion: c.identificacion } }} />
      <LineasFactura id={id} lineas={detalles.map((d) => ({
        id: d.id, codigo: d.codigo, nombre: d.nombre, adicional: d.adicional, cantidad: Number(d.cantidad),
        pvp: Math.round(Number(d.precio_unitario) * (1 + Number(d.iva_pct) / 100) * 100) / 100,
        descuento_pct: Number(d.decuento_porcentaje ?? 0),
        sub_total: Number(d.sub_total), valor_iva: Number(d.valor_iva), total: Number(d.total),
      }))} />
      <div className="grid c2">
        <div>
          <PagosFactura id={id} formas={formas.map((x) => ({ id: x.id, texto: `${x.codigo} · ${x.descripcion_form_pago}` }))} tiempos={TIEMPOS_PAGO}
            pagos={pagos.map((p) => ({ id: p.id, texto: p.descripcion, valor: Number(p.valor), plazo: p.plazo, tiempo: p.timpo }))}
            pendiente={Math.round((Number(f.total) - sumaPagos) * 100) / 100} />
          <AdicionalesFactura id={id} adicionales={adicionales} />
        </div>
        <div>
          <Totales f={f} />
          <BotonesFactura id={id} permitido={perm.permitido} />
        </div>
      </div>
    </>
  );
}
