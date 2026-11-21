'use client';
import { useActionState } from 'react';
import { iniciarSesion, type EstadoLogin } from './actions';
import { CampoClave } from '@/components/CampoClave';

export function FormLogin() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});
  return (
    <form action={accion}>
      {estado.error && <div className="alerta error">{estado.error}</div>}
      <div className="campo">
        <label htmlFor="usuario">Usuario</label>
        <input id="usuario" name="usuario" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus />
      </div>
      <div className="campo">
        <label htmlFor="clave">Clave</label>
        <CampoClave id="clave" name="clave" autoComplete="current-password" required />
      </div>
      <button className="btn primario" style={{ width: '100%', marginTop: 8 }} disabled={pendiente}>
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
