import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarGuia } from '@/lib/comprobantes/guia_remision';
import { estadoElectronico } from '@/lib/comprobantes/estadoDoc';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { AccionesSri } from '@/components/comprobante/AccionesSri';
import { fecha, fechaHora } from '@/lib/formato';
import { ESTADO } from '@/lib/constantes';

export default async function VerGuia({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql`select 1 from guia_remision where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  const { g, destinatarios, detalles, adicionales } = await cargarGuia(id);
  const el = await estadoElectronico(5, id, s.emisorId);
  const borrador = g.estado === ESTADO.PENDIENTE || g.estado === ESTADO.PAGADO;
  const correo = destinatarios.map((d) => d.correo).filter(Boolean).join(';') || g.correo_transportista;
  return (
    <>
      <Cabecera titulo={`Guía de remisión ${g.numero_comprobante || `borrador #${g.id}`}`} sub={<>Transporte del {fecha(g.fecha_inicio_transporte)} al {fecha(g.fecha_fin_transporte)} · <Estado id={g.estado} /></>}>
        {borrador && <Link className="btn primario" href={`/guias-remision/${id}/editar`}>Editar</Link>}
        <Link className="btn" href="/guias-remision">Volver</Link>
      </Cabecera>
      {el.mensajes && g.estado !== ESTADO.AUTORIZADO && <Alerta tipo="error"><strong>Mensaje del SRI:</strong><div style={{ whiteSpace: 'pre-wrap' }}>{el.mensajes}</div></Alerta>}
      <div className="grid c2">
        <div className="card">
          <h2>Transporte</h2>
          <dl className="datos">
            <dt>Transportista</dt><dd>{g.transportista}</dd>
            <dt>Identificación</dt><dd>{g.ident_transportista}</dd>
            <dt>Placa</dt><dd>{g.placa || g.placa_transportista}</dd>
            <dt>Partida</dt><dd>{g.direccion_partida}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Datos del comprobante</h2>
          <dl className="datos">
            <dt>Número</dt><dd>{g.numero_comprobante || '—'}</dd>
            <dt>Clave de acceso</dt><dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{g.clave_acceso || '—'}</dd>
            <dt>Establecimiento</dt><dd>{g.dir_establecimiento}</dd>
            <dt>Autorización</dt><dd>{g.fecha_autorizacion ? fechaHora(g.fecha_autorizacion) : '—'}</dd>
          </dl>
        </div>
      </div>
      {!borrador && (
        <AccionesSri tipo={5} id={id} estado={g.estado} tieneClave={g.clave_acceso?.length === 49} correo={correo}
          emisionPermitida={el.emisionPermitida} motivoBloqueo={el.motivoBloqueo} puedeEmitir tieneXmlAutorizado={el.tieneXmlAutorizado} />
      )}
      {destinatarios.map((d, i) => (
        <div className="card" key={d.id}>
          <h2>{i + 1}. {d.nombre_cliente} · {d.identificacion}</h2>
          <dl className="datos" style={{ marginBottom: 10 }}>
            <dt>Destino</dt><dd>{d.direccion_destino || d.direccion_cliente}</dd>
            <dt>Motivo</dt><dd>{d.motivo_traslado}</dd>
            {d.numero_factura && <><dt>Factura</dt><dd>{d.numero_factura} del {fecha(d.fecha_emision_factura)}</dd></>}
            {d.ruta && <><dt>Ruta</dt><dd>{d.ruta}</dd></>}
          </dl>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cantidad</th></tr></thead>
              <tbody>
                {detalles.filter((x) => x.id_destinatario === d.id).map((x) => (
                  <tr key={x.id}><td className="nowrap">{x.codigo}</td><td>{x.nombre}</td><td className="num">{Number(x.cantidad)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {adicionales.length > 0 && (
        <div className="card">
          <h2>Información adicional</h2>
          <dl className="datos">{adicionales.map((a) => <Fragment key={a.id}><dt>{a.nombre}</dt><dd>{a.descripcion}</dd></Fragment>)}</dl>
        </div>
      )}
    </>
  );
}
