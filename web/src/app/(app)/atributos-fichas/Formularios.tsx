'use client';
import { useActionState, useState } from 'react';
import { guardarAtributo } from './actions';
import { Msg, type EstadoForm } from '../admin/_comun/Msg';

export function FormAtributo({ id, nombre }: { id?: number; nombre?: string }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarAtributo, {});
  const [editando, setEditando] = useState(!id);
  if (!editando) return <button className="btn chico" onClick={() => setEditando(true)}>Renombrar</button>;
  return (
    <form action={accion} className="filtros" style={{ marginBottom: 0 }}>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="campo busqueda">
        {!id && <label>Nuevo atributo</label>}
        <input name="nombre" defaultValue={nombre} maxLength={100} placeholder="Ej. TALLA, FECHA DE NACIMIENTO" required />
      </div>
      <button className="btn primario" disabled={pend}>{id ? 'Guardar' : 'Agregar'}</button>
      {id && <button type="button" className="btn" onClick={() => setEditando(false)}>Cancelar</button>}
      <Msg e={e} />
    </form>
  );
}
