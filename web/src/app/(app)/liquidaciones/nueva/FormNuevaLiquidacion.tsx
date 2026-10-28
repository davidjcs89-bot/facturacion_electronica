'use client';
import { useActionState } from 'react';
import { crearLiquidacion, type Estado } from '../actions';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';

export function FormNuevaLiquidacion({ puntos, hoy }: { puntos: { id: number; texto: string }[]; hoy: string }) {
  const [e, accion, pendiente] = useActionState<Estado, FormData>(crearLiquidacion, {});
  return (
    <form action={accion} className="card">
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <div className="form-grid">
        <div className="campo"><label>Punto de emisión *</label>
          <select name="id_punto_emision" defaultValue={puntos[0]?.id}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
        <div className="campo"><label>Fecha de emisión *</label><input type="date" name="fecha_emision" defaultValue={hoy} required /></div>
        <SelectorCliente inicial={null} etiqueta="Proveedor" />
      </div>
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pendiente}>{pendiente ? 'Creando…' : 'Continuar'}</button>
      </div>
    </form>
  );
}
