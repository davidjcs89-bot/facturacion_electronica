'use client';
import { useActionState } from 'react';
import { crearGuia, type Estado } from '../actions';
import { CamposCabecera } from '../CamposCabecera';

export function FormNuevaGuia({ puntos, transportistas, hoy, partida }: {
  puntos: { id: number; texto: string }[]; transportistas: { id: number; texto: string; placa: string }[]; hoy: string; partida: string;
}) {
  const [e, accion, pendiente] = useActionState<Estado, FormData>(crearGuia, {});
  return (
    <form action={accion} className="card">
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <CamposCabecera puntos={puntos} transportistas={transportistas} valores={{ inicio: hoy, fin: hoy, partida, placa: '' }} />
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pendiente}>{pendiente ? 'Creando…' : 'Continuar'}</button>
      </div>
    </form>
  );
}
