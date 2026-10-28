import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Estado, Vacio } from '@/components/ui';
import { fecha, fechaHora } from '@/lib/formato';
import { comprobantesConProblemas, colaDelEmisor, RUTAS } from './datos';
import { BotonProcesar } from './BotonProcesar';

export default async function NoAutorizados() {
  const s = await requerirEmisor();
  const [problemas, cola, historial] = await Promise.all([
    comprobantesConProblemas(s.emisorId),
    colaDelEmisor(s.emisorId),
    sql<{ tipo_comprobantes: string; numero: string; mensajes: string; fecha_modificacion: Date }[]>`
      select tipo_comprobantes, numero, mensajes, fecha_modificacion from vw_comprobantes_no_autorizados
      where id_emisor = ${s.emisorId} order by fecha_modificacion desc limit 100`,
  ]);
  return (
    <>
      <Cabecera titulo="Comprobantes no autorizados" sub="Comprobantes finalizados que aún no tienen autorización del SRI" />
      <BotonProcesar pendientes={cola.length} />
      <div className="card sin-padding">
        <div style={{ padding: '14px 16px 0' }}><h2>Pendientes o rechazados</h2></div>
        {problemas.length === 0 ? <Vacio>No hay comprobantes con problemas.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Número</th><th>Fecha</th><th>Estado</th><th>Mensaje del SRI</th></tr></thead>
              <tbody>{problemas.map((c) => (
                <tr key={`${c.tipo}-${c.id}`}>
                  <td className="nowrap">{RUTAS[c.tipo]?.[1]}</td>
                  <td className="nowrap"><Link href={`${RUTAS[c.tipo]?.[0]}/${c.id}`}>{c.numero}</Link></td>
                  <td className="nowrap">{fecha(c.fecha)}</td>
                  <td><Estado id={c.estado} />{c.en_cola && <div className="muted" style={{ fontSize: '0.8rem' }}>en cola</div>}</td>
                  <td style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{c.mensajes}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card sin-padding">
        <div style={{ padding: '14px 16px 0' }}><h2>Historial de mensajes del SRI</h2><p className="muted" style={{ marginTop: 0 }}>Comprobantes con mensajes de rechazo registrados (incluye datos del sistema anterior).</p></div>
        {historial.length === 0 ? <Vacio>Sin mensajes.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Número</th><th>Fecha</th><th>Mensaje</th></tr></thead>
              <tbody>{historial.map((h, i) => (
                <tr key={i}><td>{h.tipo_comprobantes}</td><td className="nowrap">{h.numero}</td><td className="nowrap">{fechaHora(h.fecha_modificacion)}</td>
                  <td style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{h.mensajes}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
