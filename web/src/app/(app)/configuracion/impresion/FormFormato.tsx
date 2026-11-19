'use client';
import { useActionState } from 'react';
import { guardarFormato } from './actions';
import { Msg, type EstadoForm } from '../../admin/_comun/Msg';

type Op = [string, string][];

export function FormFormato({ formato, alEmitir, formatos, acciones }: { formato: string; alEmitir: string; formatos: Op; acciones: Op }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarFormato, {});
  return (
    <form action={accion} className="card">
      <h2>Formato de impresión</h2>
      <Msg e={e} />
      <div className="grid c2">
        <div className="campo">
          <label htmlFor="formato">Imprimir en</label>
          <select id="formato" name="formato" defaultValue={formato}>
            {formatos.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="al_emitir">Al terminar de emitir un comprobante</label>
          <select id="al_emitir" name="al_emitir" defaultValue={alEmitir}>
            {acciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Para el ticket, deje la impresora térmica (por ejemplo, Epson TM-T20) como impresora predeterminada del computador y elija
        el mismo ancho de papel. Siempre puede reimprimir con el botón «Imprimir» de cada comprobante.
      </p>
      <div className="acciones"><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
