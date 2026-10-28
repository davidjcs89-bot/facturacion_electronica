import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarRetencion } from '@/lib/comprobantes/retencion';
import { estadoElectronico } from '@/lib/comprobantes/estadoDoc';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { AccionesSri } from '@/components/comprobante/AccionesSri';
import { money, fecha, fechaHora } from '@/lib/formato';
import { ESTADO } from '@/lib/constantes';

export default async function VerRetencion({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql`select 1 from retencion where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  const { r, detalles, adicionales } = await cargarRetencion(id);
  const [c] = r.id_cliente
    ? await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null }[]>`
        select nombre_cliente, identificacion, direccion, correo from clientes where id = ${r.id_cliente}`
    : [];
  const el = await estadoElectronico(6, id, s.emisorId);
  const borrador = r.estado === ESTADO.PENDIENTE || r.estado === ESTADO.PAGADO;
  const total = detalles.reduce((a, d) => a + Number(d.valor_retenido), 0);
  return (
    <>
      <Cabecera titulo={`Retención ${r.numero || `borrador #${r.id}`}`} sub={<>Emitida el {fecha(r.fecha_emision)} · <Estado id={r.estado} /></>}>
        {borrador && <Link className="btn primario" href={`/retenciones/${id}/editar`}>Editar</Link>}
        <Link className="btn" href="/retenciones">Volver</Link>
      </Cabecera>
      {el.mensajes && r.estado !== ESTADO.AUTORIZADO && <Alerta tipo="error"><strong>Mensaje del SRI:</strong><div style={{ whiteSpace: 'pre-wrap' }}>{el.mensajes}</div></Alerta>}
      <div className="grid c2">
        <div className="card">
          <h2>Sujeto retenido</h2>
          {c ? (
            <dl className="datos">
              <dt>Nombre</dt><dd><Link href={`/clientes/${r.id_cliente}`}>{c.nombre_cliente}</Link></dd>
              <dt>Identificación</dt><dd>{c.identificacion}</dd>
              <dt>Dirección</dt><dd>{c.direccion}</dd>
              <dt>Correo</dt><dd>{c.correo?.toLowerCase()}</dd>
            </dl>
          ) : <p className="muted">Sin sujeto retenido</p>}
        </div>
        <div className="card">
          <h2>Datos del comprobante</h2>
          <dl className="datos">
            <dt>Número</dt><dd>{r.numero || '—'}</dd>
            <dt>Clave de acceso</dt><dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.clave_acceso || '—'}</dd>
            <dt>Establecimiento</dt><dd>{r.dir_establecimiento}</dd>
            <dt>Autorización</dt><dd>{r.fecha_autorizacion ? fechaHora(r.fecha_autorizacion) : '—'}</dd>
          </dl>
        </div>
      </div>
      {!borrador && (
        <AccionesSri tipo={6} id={id} estado={r.estado} tieneClave={r.clave_acceso?.length === 49} correo={c?.correo}
          emisionPermitida={el.emisionPermitida} motivoBloqueo={el.motivoBloqueo} puedeEmitir tieneXmlAutorizado={el.tieneXmlAutorizado} />
      )}
      <div className="card sin-padding">
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Documento sustento</th><th>Número</th><th>Fecha</th><th>Impuesto</th><th>Código</th><th className="num">Base</th><th className="num">%</th><th className="num">Retenido</th></tr></thead>
            <tbody>
              {detalles.map((d) => (
                <tr key={d.id}>
                  <td>{d.doc_sustento}</td>
                  <td className="nowrap">{d.numero_documento_ret}</td>
                  <td className="nowrap">{fecha(d.fecha_emision)}</td>
                  <td>{d.impuesto}</td>
                  <td title={d.descripcion_retencion}>{d.codigo_retencion}</td>
                  <td className="num">{money(d.base_imponible)}</td>
                  <td className="num">{money(d.porcentaje_retencion)}</td>
                  <td className="num">{money(d.valor_retenido)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={7}>Total retenido</td><td className="num">{money(total)}</td></tr></tfoot>
          </table>
        </div>
      </div>
      {adicionales.length > 0 && (
        <div className="card">
          <h2>Información adicional</h2>
          <dl className="datos">{adicionales.map((a) => <Fragment key={a.id}><dt>{a.nombre}</dt><dd>{a.descripcion}</dd></Fragment>)}</dl>
        </div>
      )}
    </>
  );
}
