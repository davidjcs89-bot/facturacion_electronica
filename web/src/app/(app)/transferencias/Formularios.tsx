'use client';
import { useActionState, useState } from 'react';
import { ListaProductos } from '../ingresos-bodega/FormIngreso';
import { crearTransferencia, finalizarTransferencia, anularTransferencia, type EstadoForm } from './actions';

type Linea = { id_producto: number; codigo: string; nombre: string; cantidad: number };

export function FormTransferencia({ bodegas }: { bodegas: { id: number; nombre: string }[] }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(crearTransferencia, {});
  const [lineas, setLineas] = useState<Linea[]>([]);
  return (
    <form action={act}>
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <input type="hidden" name="lineas" value={JSON.stringify(lineas.map((l) => ({ id_producto: l.id_producto, cantidad: l.cantidad })))} />
      <div className="card">
        <div className="form-grid">
          <div className="campo"><label>Bodega de origen *</label><select name="id_bodega_desde">{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          <div className="campo"><label>Bodega de destino *</label><select name="id_bodega_hasta" defaultValue={bodegas[1]?.id}>{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
        </div>
      </div>
      <ListaProductos lineas={lineas} setLineas={setLineas} />
      <button className="btn primario" disabled={pend || !lineas.length}>{pend ? 'Guardando…' : 'Crear transferencia'}</button>
    </form>
  );
}

export function AccionesTransferencia({ id, pendiente, anulable }: { id: number; pendiente: boolean; anulable: boolean }) {
  const [e1, fin, p1] = useActionState<EstadoForm, FormData>(finalizarTransferencia, {});
  const [e2, anu, p2] = useActionState<EstadoForm, FormData>(anularTransferencia, {});
  const msg = e1.mensaje ? e1 : e2;
  return (
    <div className="card">
      {msg.mensaje && <div className={`alerta ${msg.ok ? 'ok' : 'error'}`}>{msg.mensaje}</div>}
      <div className="acciones">
        {pendiente && <form action={fin}><input type="hidden" name="id" value={id} /><button className="btn primario" disabled={p1}>{p1 ? 'Procesando…' : 'Finalizar (mover stock)'}</button></form>}
        {anulable && <form action={anu}><input type="hidden" name="id" value={id} /><button className="btn peligro" disabled={p2}
          onClick={(ev) => { if (!confirm('¿Anular la transferencia? Si estaba finalizada se revierte el stock.')) ev.preventDefault(); }}>Anular</button></form>}
      </div>
    </div>
  );
}
