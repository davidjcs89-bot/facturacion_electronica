import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarNotaCredito } from '@/lib/comprobantes/nota_credito';
import { estadoElectronico } from '@/lib/comprobantes/estadoDoc';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { AccionesSri } from '@/components/comprobante/AccionesSri';
import { Totales } from '@/components/comprobante/Totales';
import { money, money3, fecha, fechaHora } from '@/lib/formato';
import { ESTADO } from '@/lib/constantes';

export default async function VerNotaCredito({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql`select 1 from nota_credito where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  const { n, detalles, adicionales } = await cargarNotaCredito(id);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null }[]>`
    select nombre_cliente, identificacion, direccion, correo from clientes where id = ${n.id_cliente}`;
  const el = await estadoElectronico(3, id, s.emisorId);
  const borrador = n.estado === ESTADO.PENDIENTE || n.estado === ESTADO.PAGADO;
  return (
    <>
      <Cabecera titulo={`Nota de crédito ${n.numero || `borrador #${n.id}`}`} sub={<>Emitida el {fecha(n.fecha_emision)} · <Estado id={n.estado} /></>}>
        {borrador && <Link className="btn primario" href={`/notas-credito/${id}/editar`}>Editar</Link>}
        <Link className="btn" href="/notas-credito">Volver</Link>
      </Cabecera>
      {el.mensajes && n.estado !== ESTADO.AUTORIZADO && <Alerta tipo="error"><strong>Mensaje del SRI:</strong><div style={{ whiteSpace: 'pre-wrap' }}>{el.mensajes}</div></Alerta>}
      <div className="grid c2">
        <div className="card">
          <h2>Cliente</h2>
          <dl className="datos">
            <dt>Nombre</dt><dd><Link href={`/clientes/${n.id_cliente}`}>{c.nombre_cliente}</Link></dd>
            <dt>Identificación</dt><dd>{c.identificacion}</dd>
            <dt>Dirección</dt><dd>{c.direccion}</dd>
            <dt>Correo</dt><dd>{c.correo?.toLowerCase()}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Datos del comprobante</h2>
          <dl className="datos">
            <dt>Número</dt><dd>{n.numero || '—'}</dd>
            <dt>Clave de acceso</dt><dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.clave_acceso || '—'}</dd>
            <dt>Factura modificada</dt><dd><Link href={`/facturas/${n.id_factura_devolver}`}>{n.numero_fc_mod}</Link> del {fecha(n.fecha_emision_fc_mod)}</dd>
            <dt>Motivo</dt><dd>{n.motivo}</dd>
            <dt>Establecimiento</dt><dd>{n.dir_establecimiento}</dd>
            <dt>Autorización</dt><dd>{n.fecha_autorizacion ? fechaHora(n.fecha_autorizacion) : '—'}</dd>
          </dl>
        </div>
      </div>
      {!borrador && (
        <AccionesSri tipo={3} id={id} estado={n.estado} tieneClave={n.clave_acceso?.length === 49} correo={c.correo}
          emisionPermitida={el.emisionPermitida} motivoBloqueo={el.motivoBloqueo} puedeEmitir tieneXmlAutorizado={el.tieneXmlAutorizado} />
      )}
      <div className="card sin-padding">
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">P. unitario</th><th className="num">Desc.</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th></tr></thead>
            <tbody>
              {detalles.map((d) => (
                <tr key={d.id}>
                  <td className="nowrap">{d.codigo}</td>
                  <td>{d.nombre}</td>
                  <td className="num">{Number(d.cantidad)}</td>
                  <td className="num">{money3(d.precio)}</td>
                  <td className="num">{money(d.descuento)}</td>
                  <td className="num">{money(d.subtotal)}</td>
                  <td className="num">{money(d.valor_iva)}</td>
                  <td className="num">{money(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid c2">
        <div>
          {adicionales.length > 0 && (
            <div className="card">
              <h2>Información adicional</h2>
              <dl className="datos">{adicionales.map((a) => <Fragment key={a.id}><dt>{a.nombre}</dt><dd>{a.descripcion}</dd></Fragment>)}</dl>
            </div>
          )}
        </div>
        <Totales f={{ ...n, subtotal_sin_impuestos: n.sumtota_sin_impuesto }} />
      </div>
    </>
  );
}
