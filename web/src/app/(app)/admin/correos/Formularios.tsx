'use client';
import { useActionState } from 'react';
import { guardarCuenta, probarCorreo } from './actions';
import { Msg, type EstadoForm } from '../_comun/Msg';

type C = { id?: number; direccion?: string; nombre_mostrar?: string; servidor?: string; puerto?: number; ssl?: boolean };

export function FormCuenta({ c }: { c: C }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarCuenta, {});
  return (
    <form action={accion} className="card">
      <h3>{c.id ? c.direccion : 'Nueva cuenta'}</h3>
      <Msg e={e} />
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="form-grid">
        <div className="campo"><label>Correo *</label><input name="direccion" type="email" defaultValue={c.direccion} maxLength={100} required /></div>
        <div className="campo"><label>Nombre a mostrar *</label><input name="nombre_mostrar" defaultValue={c.nombre_mostrar} maxLength={50} required /></div>
        <div className="campo"><label>Servidor SMTP *</label><input name="servidor" defaultValue={c.servidor ?? 'smtp.office365.com'} maxLength={50} required /></div>
        <div className="campo"><label>Puerto *</label><input name="puerto" type="number" defaultValue={c.puerto ?? 587} required /></div>
        <div className="campo"><label>{c.id ? 'Nueva clave (vacío = sin cambio)' : 'Clave *'}</label><input name="clave" type="password" autoComplete="new-password" required={!c.id} /></div>
        <div className="campo check" style={{ alignSelf: 'end' }}><input type="checkbox" id={`ssl${c.id ?? 'n'}`} name="ssl" defaultChecked={c.ssl ?? true} /><label htmlFor={`ssl${c.id ?? 'n'}`}>SSL / TLS</label></div>
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}

export function FormPrueba() {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(probarCorreo, {});
  return (
    <form action={accion} className="filtros">
      <div className="campo busqueda"><label>Enviar correo de prueba a</label><input name="destino" type="email" required /></div>
      <button className="btn" disabled={pend}>{pend ? 'Enviando…' : 'Probar'}</button>
      <Msg e={e} />
    </form>
  );
}
