'use client';
import { useActionState, useState } from 'react';
import { guardarAviso } from './actions';
import { Msg, type EstadoForm } from '../_comun/Msg';

export function FormAviso({ id, texto }: { id?: number; texto?: string }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarAviso, {});
  const [abierto, setAbierto] = useState(!id);
  if (!abierto) return <button className="btn chico" onClick={() => setAbierto(true)}>Editar</button>;
  return (
    <form action={accion} style={{ width: '100%' }}>
      <Msg e={e} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="campo"><label>{id ? 'Editar aviso' : 'Nuevo aviso (se muestra en el inicio de todos los usuarios)'}</label><textarea name="message" rows={3} defaultValue={texto} required /></div>
      <div className="acciones" style={{ marginTop: 8 }}>
        <button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : id ? 'Guardar' : 'Publicar'}</button>
        {id && <button type="button" className="btn" onClick={() => setAbierto(false)}>Cancelar</button>}
      </div>
    </form>
  );
}
