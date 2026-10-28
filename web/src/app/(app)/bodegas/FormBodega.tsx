'use client';
import { useActionState } from 'react';
import { guardarBodega, type EstadoForm } from './actions';

export function FormBodega({ b }: { b: { id?: number; codigo?: string; nombre?: string; activa?: boolean } }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(guardarBodega, {});
  return (
    <form action={act} className="card">
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      {b.id && <input type="hidden" name="id" value={b.id} />}
      <div className="form-grid">
        <div className="campo"><label>Código *</label><input name="codigo" defaultValue={b.codigo} maxLength={10} required /></div>
        <div className="campo"><label>Nombre *</label><input name="nombre" defaultValue={b.nombre} maxLength={300} required /></div>
        <div className="campo check" style={{ alignSelf: 'end' }}><input type="checkbox" id="act" name="activa" defaultChecked={b.activa ?? true} /><label htmlFor="act">Activa</label></div>
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
