'use client';
import { useActionState } from 'react';
import { guardarPunto } from './actions';
import { Msg, type EstadoForm } from '../../admin/_comun/Msg';

type Punto = { id?: number; numero_establecimiento?: string; numero_emision?: string; direccion?: string; id_bodega?: number };

export function FormPunto({ p, bodegas, tipos }: {
  p: Punto; bodegas: { id: number; nombre: string }[]; tipos: { id: number; descripcion: string; codigo: string; secuencial: number }[];
}) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarPunto, {});
  return (
    <form action={accion} className="card">
      <Msg e={e} />
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="form-grid">
        <div className="campo"><label>Establecimiento *</label><input name="numero_establecimiento" defaultValue={p.numero_establecimiento ?? '001'} maxLength={3} pattern="\d{3}" required /></div>
        <div className="campo"><label>Punto de emisión *</label><input name="numero_emision" defaultValue={p.numero_emision ?? '001'} maxLength={3} pattern="\d{3}" required /></div>
        <div className="campo"><label>Bodega</label>
          <select name="id_bodega" defaultValue={p.id_bodega ?? bodegas[0]?.id ?? ''}>
            {bodegas.length === 0 && <option value="">Crear BODEGA PRINCIPAL</option>}
            {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <div className="campo ancho"><label>Dirección del establecimiento *</label><input name="direccion" defaultValue={p.direccion} maxLength={100} required /></div>
      </div>
      <h3 style={{ marginTop: 16 }}>Próximo secuencial por comprobante</h3>
      <div className="form-grid">
        {tipos.map((t) => (
          <div className="campo" key={t.id}><label>{t.codigo} · {t.descripcion}</label><input type="number" name={`sec_${t.id}`} min={1} max={999999999} defaultValue={t.secuencial} required /></div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>Cuidado: un secuencial ya usado hará que el SRI rechace el comprobante por número duplicado.</p>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
