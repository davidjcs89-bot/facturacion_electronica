'use client';
import { useActionState } from 'react';
import { revisarEstadoSri, type EstadoSriForm } from './actions';

export function EstadoSri() {
  const [e, act, pend] = useActionState<EstadoSriForm>(revisarEstadoSri, {});
  const todoOk = e.revisiones?.every((r) => r.ok);
  return (
    <div className="card">
      <h2>Estado del SRI</h2>
      <p className="muted">Revisa si los servicios del SRI están funcionando. En pruebas envía una factura de ensayo (999-999, sin datos reales); en producción solo revisa la conexión.</p>
      {e.revisiones && (
        <div className={`alerta ${todoOk ? 'ok' : 'error'}`}>
          <strong>{todoOk ? 'El SRI está funcionando.' : 'El SRI está fallando: no es un problema de sus comprobantes.'}</strong>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Ambiente {e.ambiente} · {e.hora}</div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {e.revisiones.map((r) => <li key={r.servicio}>{r.ok ? '✓' : '✗'} {r.servicio}: {r.detalle}</li>)}
          </ul>
        </div>
      )}
      {e.error && <div className="alerta error">{e.error}</div>}
      <form action={act}><button className="btn" disabled={pend}>{pend ? 'Revisando el SRI…' : 'Revisar estado del SRI'}</button></form>
    </div>
  );
}
