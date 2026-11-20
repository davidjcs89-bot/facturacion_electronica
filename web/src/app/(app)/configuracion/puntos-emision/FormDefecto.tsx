'use client';
import { useActionState } from 'react';
import { guardarPuntoDefecto } from './actions';
import { Msg, type EstadoForm } from '../../admin/_comun/Msg';

export function FormDefecto({ puntos, actual }: { puntos: { id: number; texto: string }[]; actual: number | null }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarPuntoDefecto, {});
  return (
    <form action={accion} className="card">
      <h2>Punto de emisión por defecto</h2>
      <Msg e={e} />
      <div className="grid c2">
        <div className="campo">
          <label htmlFor="id_punto_defecto">Al crear facturas y demás comprobantes, seleccionar</label>
          <select id="id_punto_defecto" name="id_punto_defecto" defaultValue={actual ?? ''}>
            <option value="">El primero de la lista</option>
            {puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
          </select>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Se puede cambiar en cada comprobante antes de emitir. Las notas de crédito y de débito usan el punto de la factura que modifican.
      </p>
      <div className="acciones"><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
