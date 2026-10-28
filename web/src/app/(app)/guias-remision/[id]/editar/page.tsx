import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarGuia } from '@/lib/comprobantes/guia_remision';
import { emisionPermitida } from '@/lib/comprobantes/procesar';
import { puntosEmision } from '@/lib/catalogos';
import { fechaInput } from '@/lib/formato';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { ESTADO } from '@/lib/constantes';
import { CabeceraGuia, DestinatariosGuia, AdicionalesGuia, BotonesGuia } from './Editor';

export default async function EditarGuia({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql<{ estado: number }[]>`select estado from guia_remision where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  if (ok.estado !== ESTADO.PENDIENTE && ok.estado !== ESTADO.PAGADO) redirect(`/guias-remision/${id}`);
  const [{ g, destinatarios, detalles, adicionales }, puntos, perm] = await Promise.all([cargarGuia(id), puntosEmision(s.emisorId), emisionPermitida(s.emisorId)]);
  const transportistas = await sql<{ id: number; nombre: string; numero_identificacion: string; placa: string }[]>`
    select id, nombre, numero_identificacion, placa from transportistas where id_emisor = ${s.emisorId} order by nombre`;
  return (
    <>
      <Cabecera titulo={`Guía de remisión · borrador #${g.id}`} sub={<Estado id={g.estado} />}>
        <Link className="btn" href="/guias-remision">Volver</Link>
      </Cabecera>
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      <CabeceraGuia id={id}
        puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
        transportistas={transportistas.map((t) => ({ id: t.id, texto: `${t.nombre} · ${t.numero_identificacion}`, placa: t.placa }))}
        valores={{ id_punto_emision: g.id_punto_emision, id_transportista: g.id_transportista, inicio: fechaInput(g.fecha_inicio_transporte), fin: fechaInput(g.fecha_fin_transporte), partida: g.direccion_partida, placa: g.placa }} />
      <DestinatariosGuia id={id} destinatarios={destinatarios.map((d) => ({
        id: d.id, nombre: d.nombre_cliente, identificacion: d.identificacion, destino: d.direccion_destino, motivo: d.motivo_traslado,
        factura: d.numero_factura, fechaFactura: d.numero_factura ? fechaInput(d.fecha_emision_factura) : '', ruta: d.ruta,
        productos: detalles.filter((x) => x.id_destinatario === d.id).map((x) => ({ id: x.id, codigo: x.codigo, nombre: x.nombre, cantidad: Number(x.cantidad) })),
      }))} />
      <div className="grid c2">
        <AdicionalesGuia id={id} adicionales={adicionales} />
        <BotonesGuia id={id} permitido={perm.permitido} />
      </div>
    </>
  );
}
