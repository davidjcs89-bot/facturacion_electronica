'use client';
import { useActionState } from 'react';
import { procesarPendientes, type EstadoForm } from './actions';

export function BotonProcesar({ pendientes }: { pendientes: number }) {
  const [e, act, pend] = useActionState<EstadoForm>(procesarPendientes, {});
  return (
    <div className="card">
      <h2>Cola de envío</h2>
      <p className="muted">{pendientes} comprobantes pendientes: los que el SRI no recibió se reenvían con la misma clave y número, y de los recibidos se consulta la autorización.</p>
      {e.mensaje && <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}
        {e.detalle?.length ? <details><summary>Detalle</summary><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.detalle.join('\n')}</pre></details> : null}
      </div>}
      <form action={act}><button className="btn primario" disabled={pend || pendientes === 0}>{pend ? 'Procesando con el SRI…' : 'Procesar pendientes con el SRI'}</button></form>
    </div>
  );
}
