import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarFactura } from '@/lib/comprobantes/factura';
import { estadoElectronico } from '@/lib/comprobantes/estadoDoc';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { AccionesSri } from '@/components/comprobante/AccionesSri';
import { Totales } from '@/components/comprobante/Totales';
import { Fragment } from 'react';
import { money, money3, fecha, fechaHora } from '@/lib/formato';
import { ESTADO } from '@/lib/constantes';

export default async function VerFactura({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql`select 1 from factura where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  const { f, detalles, pagos, adicionales } = await cargarFactura(id);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null; telefono_movil: string | null }[]>`
    select nombre_cliente, identificacion, direccion, correo, telefono_movil from clientes where id = ${f.id_cliente}`;
  const el = await estadoElectronico(1, id, s.emisorId);
  const borrador = f.estado === ESTADO.PENDIENTE || f.estado === ESTADO.PAGADO;
  const [amb] = await sql<{ a: string | null }[]>`
    select coalesce(case when length(${f.clave_de_acceso ?? ''}::text) = 49 then substr(${f.clave_de_acceso ?? ''}::text, 24, 1) end, pa.ambiente, ta.codigo_ambiente) a
    from emisor em left join tipo_ambientes ta on ta.id = em.tipo_ambiente
    left join punto_emision_app pa on pa.id_punto = ${f.id_punto_emison}::int
    where em.id = ${s.emisorId}`;
  const ambiente = amb?.a === '1' ? 'Pruebas' : amb?.a === '2' ? 'Producción' : null;
  return (
    <>
      <Cabecera titulo={`Factura ${f.numero || `borrador #${f.id}`}`} sub={<>Emitida el {fecha(f.fecha_emision)} · <Estado id={f.estado} />{ambiente && <> · <span className={`badge ${ambiente === 'Pruebas' ? 'pruebas' : 'produccion'}`}>{ambiente}</span></>}</>}>
        {borrador && <Link className="btn primario" href={`/facturas/${id}/editar`}>Editar</Link>}
        <Link className="btn solo-escritorio" href={`/notas-credito/nueva?factura=${id}`}>Nota de crédito</Link>
        <Link className="btn solo-escritorio" href="/facturas">Volver</Link>
      </Cabecera>
      {el.mensajes && f.estado !== ESTADO.AUTORIZADO && <Alerta tipo="error"><strong>Mensaje del SRI:</strong><div style={{ whiteSpace: 'pre-wrap' }}>{el.mensajes}</div></Alerta>}
      <div className="grid c2">
        <div className="card">
          <h2>Cliente</h2>
          <dl className="datos">
            <dt>Nombre</dt><dd><Link href={`/clientes/${f.id_cliente}`}>{c.nombre_cliente}</Link></dd>
            <dt>Identificación</dt><dd>{c.identificacion}</dd>
            <dt>Dirección</dt><dd>{c.direccion}</dd>
            <dt>Correo</dt><dd>{c.correo?.toLowerCase()}</dd>
            <dt>Celular</dt><dd>{c.telefono_movil}</dd>
          </dl>
        </div>
        <div className="card plegable-movil">
          <h2>Datos del comprobante</h2>
          <dl className="datos">
            <dt>Número</dt><dd>{f.numero || '—'}</dd>
            <dt>Ambiente</dt><dd>{ambiente ?? '—'}{ambiente === 'Pruebas' ? ' (sin validez tributaria)' : ''}</dd>
            <dt>Clave de acceso</dt><dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{f.clave_de_acceso || '—'}</dd>
            <dt>Establecimiento</dt><dd>{f.dir_establecimiento}</dd>
            {f.guia_de_remision && <><dt>Guía de remisión</dt><dd>{f.guia_de_remision}</dd></>}
            <dt>Autorización</dt><dd>{f.fecha_autorizacion ? fechaHora(f.fecha_autorizacion) : '—'}</dd>
          </dl>
        </div>
      </div>
      {!borrador && (
        <AccionesSri tipo={1} id={id} estado={f.estado} tieneClave={f.clave_de_acceso?.length === 49} correo={c.correo}
          emisionPermitida={el.emisionPermitida} motivoBloqueo={el.motivoBloqueo} puedeEmitir tieneXmlAutorizado={el.tieneXmlAutorizado}
          nombre={`Factura ${f.numero || f.id}`} extras={[{ href: `/notas-credito/nueva?factura=${id}`, texto: 'Nota de crédito' }]} />
      )}
      <div className="card sin-padding">
        <div className="tabla-wrap">
          <table className="tabla tarjetas">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">P. unitario</th><th className="num">Desc.</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th></tr></thead>
            <tbody>
              {detalles.map((d) => (
                <tr key={d.id}>
                  <td className="nowrap" data-r="ocultar">{d.codigo}</td>
                  <td data-r="titulo">{d.nombre}{d.adicional && d.adicional !== d.nombre ? <div className="muted">{d.adicional}</div> : null}</td>
                  <td className="num" data-r="sub">{Number(d.cantidad)}</td>
                  <td className="num" data-r="sub2" data-x=" × $">{money3(d.precio_unitario)}</td>
                  <td className="num" data-r={Number(d.descuento) ? 'sub2' : 'ocultar'} data-x=" · desc. $">{money(d.descuento)}</td>
                  <td className="num" data-r="ocultar">{money(d.sub_total)}</td>
                  <td className="num" data-r="ocultar">{money(d.valor_iva)}</td>
                  <td className="num" data-r="monto">{money(d.total)}</td>
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
        <Totales f={f} />
      </div>
    </>
  );
}
