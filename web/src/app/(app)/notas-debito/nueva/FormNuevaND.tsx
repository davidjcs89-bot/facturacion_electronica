'use client';
import { useActionState } from 'react';
import { crearNotaDebito, type Estado } from '../actions';

type Opcion = { id: number; texto: string };

export function FormNuevaND({ idFactura, hoy, puntoDefecto, ivaDefecto, puntos, ivas }: {
  idFactura: number; hoy: string; puntoDefecto: number; ivaDefecto: number; puntos: Opcion[]; ivas: Opcion[];
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(crearNotaDebito, {});
  return (
    <form action={accion} className="card">
      <input type="hidden" name="id_factura" value={idFactura} />
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <div className="form-grid">
        <div className="campo"><label>Punto de emisión *</label>
          <select name="id_punto_emision" defaultValue={puntoDefecto}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
        <div className="campo"><label>Fecha de emisión *</label><input type="date" name="fecha_emision" defaultValue={hoy} required /></div>
        <div className="campo"><label>IVA *</label>
          <select name="id_porcentaje_iva" defaultValue={ivaDefecto}>{ivas.map((i) => <option key={i.id} value={i.id}>{i.texto}</option>)}</select>
        </div>
        <div className="campo ancho"><label>Primer motivo (razón de la modificación)</label><input name="razon" maxLength={200} placeholder="Ej.: INTERESES POR MORA" /></div>
        <div className="campo"><label>Valor (sin IVA)</label><input name="valor" type="number" step="0.01" min="0" /></div>
      </div>
      <div className="acciones" style={{ marginTop: 16 }}><button className="btn primario" disabled={pend}>{pend ? 'Creando…' : 'Continuar'}</button></div>
    </form>
  );
}
