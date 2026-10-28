'use client';
import { useActionState } from 'react';
import { guardarImpresion } from './actions';
import { Msg, type EstadoForm } from '../../admin/_comun/Msg';

export function FormImpresion({ tipo, nombre, firma, mensajes }: { tipo: number; nombre: string; firma: boolean; mensajes: string | null }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarImpresion, {});
  return (
    <form action={accion} className="card">
      <h3>{nombre}</h3>
      <Msg e={e} />
      <input type="hidden" name="id_comprobante" value={tipo} />
      <div className="campo check" style={{ marginBottom: 8 }}><input type="checkbox" id={`f${tipo}`} name="firma" defaultChecked={firma} /><label htmlFor={`f${tipo}`}>Incluir línea de firma</label></div>
      <div className="campo"><label>Mensaje al pie</label><textarea name="mensajes" rows={2} defaultValue={mensajes ?? ''} placeholder="Ej. Gracias por su compra" /></div>
      <div className="acciones" style={{ marginTop: 8 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
