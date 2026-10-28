import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarNotaDebito } from '@/lib/comprobantes/nota_debito';
import { emisionPermitida } from '@/lib/comprobantes/procesar';
import { puntosEmision, formasPago } from '@/lib/catalogos';
import { fechaInput, fecha } from '@/lib/formato';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { Totales } from '@/components/comprobante/Totales';
import { ESTADO, TIEMPOS_PAGO } from '@/lib/constantes';
import { tarifasIva } from '../../ivas';
import { CabeceraND, MotivosND, PagosND, AdicionalesND, BotonesND } from './Editor';

export default async function EditarNotaDebito({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql<{ estado: number }[]>`select estado from nota_debito where id = ${id} and id_emisior = ${s.emisorId}`;
  if (!ok) notFound();
  if (ok.estado !== ESTADO.PENDIENTE && ok.estado !== ESTADO.PAGADO) redirect(`/notas-debito/${id}`);
  const [{ n, motivos, pagos, adicionales }, puntos, formas, ivas, perm] = await Promise.all([
    cargarNotaDebito(id), puntosEmision(s.emisorId), formasPago(), tarifasIva(), emisionPermitida(s.emisorId),
  ]);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string }[]>`select nombre_cliente, identificacion from clientes where id = ${n.id_cliente}`;
  const sumaPagos = pagos.reduce((a, p) => a + Number(p.valor), 0);
  return (
    <>
      <Cabecera titulo={`Nota de débito · borrador #${n.id}`} sub={<>Factura <Link href={`/facturas/${n.id_factura_modifica}`}>{n.numero_factura_modifica}</Link> del {fecha(n.fecha_factura_modifica)} · {c.nombre_cliente} ({c.identificacion}) · <Estado id={n.estado} /></>}>
        <Link className="btn" href="/notas-debito">Volver</Link>
      </Cabecera>
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      <CabeceraND id={id} puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
        ivas={ivas.map((i) => ({ id: i.id, texto: i.descripcion }))}
        valores={{ id_punto_emision: n.id_punto_emision, fecha: fechaInput(n.fecha_emision), id_porcentaje_iva: n.id_porcentaje_iva }} />
      <MotivosND id={id} motivos={motivos.map((m) => ({ id: m.id, razon: m.razon_modificacion, valor: Number(m.valor_modificacion) }))} />
      <div className="grid c2">
        <div>
          <PagosND id={id} formas={formas.map((x) => ({ id: x.id, texto: `${x.codigo} · ${x.descripcion_form_pago}` }))} tiempos={TIEMPOS_PAGO}
            pagos={pagos.map((p) => ({ id: p.id, texto: p.descripcion, valor: Number(p.valor), plazo: p.plazo, tiempo: p.timpo }))}
            pendiente={Math.round((Number(n.total) - sumaPagos) * 100) / 100} />
          <AdicionalesND id={id} adicionales={adicionales} />
        </div>
        <div>
          <Totales f={n} />
          <BotonesND id={id} permitido={perm.permitido} />
        </div>
      </div>
    </>
  );
}
