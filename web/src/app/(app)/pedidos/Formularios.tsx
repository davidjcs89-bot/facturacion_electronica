'use client';
import { useActionState } from 'react';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { Msg, type EstadoForm } from '../proformas/_comun/EditorLineas';
import { agregarAbono, eliminarAbono } from './actions';
import { money, fecha } from '@/lib/formato';

export function FormPedido({ id, accion, puntos, valores, boton }: {
  id?: number; accion: (p: EstadoForm, fd: FormData) => Promise<EstadoForm>; boton: string; puntos: { id: number; texto: string }[];
  valores: { punto: number | null; cliente: { id: number; nombre: string; identificacion: string } | null };
}) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(accion, {});
  return (
    <form action={act} className="card">
      <Msg e={e} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="form-grid">
        <div className="campo"><label>Punto de emisión *</label>
          <select name="id_punto_emision" defaultValue={valores.punto ?? puntos[0]?.id}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
        <SelectorCliente inicial={valores.cliente} tipo={1} permitirConsumidorFinal />
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : boton}</button></div>
    </form>
  );
}

export function Abonos({ id, abonos, saldo, editable }: { id: number; abonos: { id: number; fecha: Date; valor: number; descripcion: string | null }[]; saldo: number; editable: boolean }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(agregarAbono, {});
  return (
    <div className="card">
      <h2>Abonos</h2>
      <Msg e={e} />
      {abonos.map((a) => (
        <div key={a.id} className="acciones" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
          <span>{fecha(a.fecha)}{a.descripcion ? ` · ${a.descripcion}` : ''}</span>
          <span className="acciones"><strong>{money(a.valor)}</strong>
            {editable && <form action={eliminarAbono}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_abono" value={a.id} /><button className="btn chico peligro">Quitar</button></form>}
          </span>
        </div>
      ))}
      <p><strong>Saldo pendiente: ${money(saldo)}</strong></p>
      {editable && (
        <form action={act} className="filtros">
          <input type="hidden" name="id" value={id} />
          <div className="campo" style={{ maxWidth: 140 }}><label>Monto</label><input name="valor" type="number" step="0.01" min="0" /></div>
          <div className="campo busqueda"><label>Descripción</label><input name="descripcion" maxLength={500} /></div>
          <button className="btn" disabled={pend}>Registrar abono</button>
        </form>
      )}
    </div>
  );
}
