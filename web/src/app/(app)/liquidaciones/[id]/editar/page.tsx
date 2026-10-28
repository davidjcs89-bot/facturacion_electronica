import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarLiquidacion } from '@/lib/comprobantes/liquidacion_compra';
import { emisionPermitida } from '@/lib/comprobantes/procesar';
import { puntosEmision, formasPago } from '@/lib/catalogos';
import { fechaInput } from '@/lib/formato';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { Totales } from '@/components/comprobante/Totales';
import { ESTADO, TIEMPOS_PAGO } from '@/lib/constantes';
import { CabeceraLiquidacion, LineasLiquidacion, PagosLiquidacion, AdicionalesLiquidacion, BotonesLiquidacion } from './Editor';

export default async function EditarLiquidacion({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql<{ estado: number }[]>`select estado from liquidacion_compra where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  if (ok.estado !== ESTADO.PENDIENTE && ok.estado !== ESTADO.PAGADO) redirect(`/liquidaciones/${id}`);
  const [{ l, detalles, pagos, adicionales }, puntos, formas, perm] = await Promise.all([
    cargarLiquidacion(id), puntosEmision(s.emisorId), formasPago(), emisionPermitida(s.emisorId),
  ]);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string }[]>`select nombre_cliente, identificacion from clientes where id = ${l.id_cliente}`;
  const sumaPagos = pagos.reduce((a, p) => a + Number(p.valor), 0);
  return (
    <>
      <Cabecera titulo={`Liquidación de compra · borrador #${l.id}`} sub={<Estado id={l.estado} />}>
        <Link className="btn" href="/liquidaciones">Volver</Link>
      </Cabecera>
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      <CabeceraLiquidacion id={id} puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
        valores={{ id_punto_emision: l.id_punto_emison, fecha: fechaInput(l.fecha_emision), cliente: { id: l.id_cliente, nombre: c?.nombre_cliente ?? '', identificacion: c?.identificacion ?? '' } }} />
      <LineasLiquidacion id={id} lineas={detalles.map((d) => ({
        id: d.id, codigo: d.codigo, nombre: d.nombre, adicional: d.adicional, cantidad: Number(d.cantidad),
        pvp: Number(d.precio_unitario), descuento_pct: Number(d.decuento_porcentaje ?? 0),
        sub_total: Number(d.sub_total), valor_iva: Number(d.valor_iva), total: Number(d.total),
      }))} />
      <div className="grid c2">
        <div>
          <PagosLiquidacion id={id} formas={formas.map((x) => ({ id: x.id, texto: `${x.codigo} · ${x.descripcion_form_pago}` }))} tiempos={TIEMPOS_PAGO}
            pagos={pagos.map((p) => ({ id: p.id, texto: p.descripcion, valor: Number(p.valor), plazo: p.plazo, tiempo: p.timpo }))}
            pendiente={Math.round((Number(l.total) - sumaPagos) * 100) / 100} />
          <AdicionalesLiquidacion id={id} adicionales={adicionales} />
        </div>
        <div>
          <Totales f={{ ...l, propina: undefined }} />
          <BotonesLiquidacion id={id} permitido={perm.permitido} />
        </div>
      </div>
    </>
  );
}
