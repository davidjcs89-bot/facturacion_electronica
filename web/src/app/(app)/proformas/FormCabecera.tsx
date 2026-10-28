'use client';
import { useActionState } from 'react';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { Msg, type EstadoForm } from './_comun/EditorLineas';

export function FormCabecera({ id, accion, valores, boton }: {
  id?: number; accion: (p: EstadoForm, fd: FormData) => Promise<EstadoForm>; boton: string;
  valores: { fecha: string; observaciones: string; cliente: { id: number; nombre: string; identificacion: string } | null };
}) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(accion, {});
  return (
    <form action={act} className="card">
      <Msg e={e} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="form-grid">
        <div className="campo"><label>Fecha *</label><input type="date" name="fecha_emision" defaultValue={valores.fecha} required /></div>
        <div className="campo" style={{ gridColumn: 'span 2' }}><label>Observaciones</label><input name="observaciones" defaultValue={valores.observaciones} maxLength={100} /></div>
        <SelectorCliente inicial={valores.cliente} tipo={1} permitirConsumidorFinal />
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : boton}</button></div>
    </form>
  );
}
