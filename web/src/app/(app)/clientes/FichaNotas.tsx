'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { guardarFicha, agregarNota } from './fichas';
import { Msg, type EstadoForm } from '../admin/_comun/Msg';

export function FormFicha({ idCliente, atributos }: { idCliente: number; atributos: { id: number; nombre: string; valor: string | null }[] }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarFicha, {});
  return (
    <div className="card">
      <h2>Ficha del cliente</h2>
      {atributos.length === 0 ? (
        <p className="muted">No hay atributos definidos. <Link href="/atributos-fichas">Crear atributos</Link></p>
      ) : (
        <form action={accion}>
          <Msg e={e} />
          <input type="hidden" name="id_cliente" value={idCliente} />
          <div className="form-grid">
            {atributos.map((a) => (
              <div className="campo" key={a.id}><label>{a.nombre}</label><textarea name={`attr_${a.id}`} defaultValue={a.valor ?? ''} rows={2} /></div>
            ))}
          </div>
          <div className="acciones" style={{ marginTop: 12 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar ficha'}</button></div>
        </form>
      )}
    </div>
  );
}

export function FormNota({ idCliente }: { idCliente: number }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(agregarNota, {});
  return (
    <form action={accion}>
      <Msg e={e} />
      <input type="hidden" name="id_cliente" value={idCliente} />
      <div className="campo"><label>Nueva nota</label><textarea name="nota" rows={3} required /></div>
      <div className="acciones" style={{ marginTop: 8 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Agregar nota'}</button></div>
    </form>
  );
}
