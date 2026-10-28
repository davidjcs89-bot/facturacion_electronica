'use client';
import { useActionState } from 'react';
import { iniciarSesion, type EstadoLogin } from './actions';

export function FormLogin() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});
  return (
    <form action={accion}>
      {estado.error && <div className="alerta error">{estado.error}</div>}
      <div className="campo">
        <label htmlFor="usuario">Usuario</label>
        <input id="usuario" name="usuario" autoComplete="username" required autoFocus />
      </div>
      <div className="campo">
        <label htmlFor="clave">Clave</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn primario" style={{ width: '100%', marginTop: 8 }} disabled={pendiente}>
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
