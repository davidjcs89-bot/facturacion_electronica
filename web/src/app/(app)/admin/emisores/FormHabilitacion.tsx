'use client';
import { useActionState } from 'react';
import { guardarHabilitacion } from './actions';
import { Msg, type EstadoForm } from '../_comun/Msg';
import { ESTADOS_CUENTA } from '../_comun/estados';

export function FormHabilitacion({ id, desde, hasta, estado }: { id: number; desde: string; hasta: string; estado: number }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarHabilitacion, {});
  return (
    <form action={accion} className="card">
      <h2>Habilitación</h2>
      <Msg e={e} />
      <input type="hidden" name="id" value={id} />
      <div className="form-grid">
        <div className="campo"><label>Desde</label><input type="date" name="fecha_desde" defaultValue={desde} required /></div>
        <div className="campo"><label>Hasta</label><input type="date" name="fecha_hasta" defaultValue={hasta} required /></div>
        <div className="campo"><label>Estado</label>
          <select name="estado" defaultValue={estado}>{Object.entries(ESTADOS_CUENTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>Los usuarios del emisor no pueden ingresar fuera del período de habilitación.</p>
      <button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button>
    </form>
  );
}
