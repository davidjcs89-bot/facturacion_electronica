'use client';
import { useActionState } from 'react';
import { crearRetencion, type Estado } from '../actions';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';

export function FormNuevaRetencion({ puntos, hoy }: { puntos: { id: number; texto: string }[]; hoy: string }) {
  const [e, accion, pendiente] = useActionState<Estado, FormData>(crearRetencion, {});
  return (
    <form action={accion} className="card">
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <div className="form-grid">
        <div className="campo"><label>Punto de emisión *</label>
          <select name="id_punto_emision" defaultValue={puntos[0]?.id}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
        <div className="campo"><label>Fecha de emisión *</label><input type="date" name="fecha_emision" defaultValue={hoy} required /></div>
        <SelectorCliente inicial={null} tipo={2} etiqueta="Sujeto retenido" />
      </div>
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pendiente}>{pendiente ? 'Creando…' : 'Continuar'}</button>
      </div>
    </form>
  );
}
