import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarNotaDebito } from '@/lib/comprobantes/nota_debito';
import { estadoElectronico } from '@/lib/comprobantes/estadoDoc';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { AccionesSri } from '@/components/comprobante/AccionesSri';
import { Totales } from '@/components/comprobante/Totales';
import { money, fecha, fechaHora } from '@/lib/formato';
import { ESTADO } from '@/lib/constantes';

export default async function VerNotaDebito({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql`select 1 from nota_debito where id = ${id} and id_emisior = ${s.emisorId}`;
  if (!ok) notFound();
  const { n, motivos, pagos, adicionales } = await cargarNotaDebito(id);
  const [c] = await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null }[]>`
    select nombre_cliente, identificacion, direccion, correo from clientes where id = ${n.id_cliente}`;
  const el = await estadoElectronico(4, id, s.emisorId);
  const borrador = n.estado === ESTADO.PENDIENTE || n.estado === ESTADO.PAGADO;
  return (
    <>
      <Cabecera titulo={`Nota de débito ${n.numero || `borrador #${n.id}`}`} sub={<>Emitida el {fecha(n.fecha_emision)} · <Estado id={n.estado} /></>}>
        {borrador && <Link className="btn primario" href={`/notas-debito/${id}/editar`}>Editar</Link>}
        <Link className="btn" href="/notas-debito">Volver</Link>
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
            <dt>Factura modificada</dt><dd><Link href={`/facturas/${n.id_factura_modifica}`}>{n.numero_factura_modifica}</Link> del {fecha(n.fecha_factura_modifica)}</dd>
            <dt>IVA</dt><dd>{n.iva_descripcion}</dd>
            <dt>Establecimiento</dt><dd>{n.dir_establecimiento}</dd>
            <dt>Autorización</dt><dd>{n.fecha_autorizacion ? fechaHora(n.fecha_autorizacion) : '—'}</dd>
          </dl>
        </div>
      </div>
      {!borrador && (
        <AccionesSri tipo={4} id={id} estado={n.estado} tieneClave={n.clave_acceso?.length === 49} correo={c.correo}
          emisionPermitida={el.emisionPermitida} motivoBloqueo={el.motivoBloqueo} puedeEmitir tieneXmlAutorizado={el.tieneXmlAutorizado} />
      )}
      <div className="card sin-padding">
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Razón de la modificación</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {motivos.map((m) => <tr key={m.id}><td>{m.razon_modificacion}</td><td className="num">{money(m.valor_modificacion)}</td></tr>)}
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
        <Totales f={n} />
      </div>
    </>
  );
}
