import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarLiquidacion } from '@/lib/comprobantes/liquidacion_compra';
import { estadoElectronico } from '@/lib/comprobantes/estadoDoc';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { AccionesSri } from '@/components/comprobante/AccionesSri';
import { Totales } from '@/components/comprobante/Totales';
import { money, money3, fecha, fechaHora } from '@/lib/formato';
import { ESTADO } from '@/lib/constantes';

export default async function VerLiquidacion({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql`select 1 from liquidacion_compra where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  const { l, detalles, pagos, adicionales } = await cargarLiquidacion(id);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null; telefono_movil: string | null }[]>`
    select nombre_cliente, identificacion, direccion, correo, telefono_movil from clientes where id = ${l.id_cliente}`;
  const el = await estadoElectronico(2, id, s.emisorId);
  const borrador = l.estado === ESTADO.PENDIENTE || l.estado === ESTADO.PAGADO;
  return (
    <>
      <Cabecera titulo={`Liquidación de compra ${l.numero || `borrador #${l.id}`}`} sub={<>Emitida el {fecha(l.fecha_emision)} · <Estado id={l.estado} /></>}>
        {borrador && <Link className="btn primario" href={`/liquidaciones/${id}/editar`}>Editar</Link>}
        <Link className="btn" href="/liquidaciones">Volver</Link>
      </Cabecera>
      {el.mensajes && l.estado !== ESTADO.AUTORIZADO && <Alerta tipo="error"><strong>Mensaje del SRI:</strong><div style={{ whiteSpace: 'pre-wrap' }}>{el.mensajes}</div></Alerta>}
      <div className="grid c2">
        <div className="card">
          <h2>Proveedor</h2>
          <dl className="datos">
            <dt>Nombre</dt><dd><Link href={`/clientes/${l.id_cliente}`}>{c?.nombre_cliente}</Link></dd>
            <dt>Identificación</dt><dd>{c?.identificacion}</dd>
            <dt>Dirección</dt><dd>{c?.direccion}</dd>
            <dt>Correo</dt><dd>{c?.correo?.toLowerCase()}</dd>
            <dt>Celular</dt><dd>{c?.telefono_movil}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Datos del comprobante</h2>
          <dl className="datos">
            <dt>Número</dt><dd>{l.numero || '—'}</dd>
            <dt>Clave de acceso</dt><dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.clave_de_acceso || '—'}</dd>
            <dt>Establecimiento</dt><dd>{l.dir_establecimiento}</dd>
            <dt>Autorización</dt><dd>{l.fecha_autorizacion ? fechaHora(l.fecha_autorizacion) : '—'}</dd>
          </dl>
        </div>
      </div>
      {!borrador && (
        <AccionesSri tipo={2} id={id} estado={l.estado} tieneClave={l.clave_de_acceso?.length === 49} correo={c?.correo}
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
                  <td>{d.nombre}{d.adicional ? <div className="muted">{d.adicional}</div> : null}</td>
                  <td className="num">{Number(d.cantidad)}</td>
                  <td className="num">{money3(d.precio_unitario)}</td>
                  <td className="num">{money(d.descuento)}</td>
                  <td className="num">{money(d.sub_total)}</td>
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
          {pagos.length > 0 && (
            <div className="card">
              <h2>Formas de pago</h2>
              {pagos.map((p) => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{p.descripcion}{p.plazo ? ` · ${p.plazo} ${p.timpo?.toLowerCase()}` : ''}</span><strong>{money(p.valor)}</strong></div>)}
            </div>
          )}
          {adicionales.length > 0 && (
            <div className="card">
              <h2>Información adicional</h2>
              <dl className="datos">{adicionales.map((a) => <Fragment key={a.id}><dt>{a.nombre}</dt><dd>{a.descripcion}</dd></Fragment>)}</dl>
            </div>
          )}
        </div>
        <Totales f={{ ...l, propina: undefined }} />
      </div>
    </>
  );
}
