'use client';
import { useActionState, useState } from 'react';
import { guardarProducto } from './actions';
import { Msg, type EstadoForm } from '../admin/_comun/Msg';

type Opcion = { id: number; descripcion: string; porcentaje?: number };
type Producto = {
  id?: number; codigo?: string; codigo_auxiliar?: string | null; nombre?: string; tipo_producto?: number; precio?: number;
  codigo_iva?: number; codigo_ice?: number; codigo_irbpnr?: number; costo_producto?: number | null;
  fecha_elavoracionproducto?: string; fecha_caducidadproducto?: string;
};

export function FormProducto({ p, iva, ice, irbpnr, tipos, atributos, ivaPorDefecto }: {
  p: Producto; iva: Opcion[]; ice: Opcion[]; irbpnr: Opcion[]; tipos: Opcion[];
  atributos: { atributo: string; valor: string }[]; ivaPorDefecto: number;
}) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarProducto, {});
  const [precio, setPrecio] = useState(p.precio != null ? String(Number(p.precio)) : '');
  const [idIva, setIdIva] = useState(p.codigo_iva ?? ivaPorDefecto);
  const pct = iva.find((x) => x.id === Number(idIva))?.porcentaje ?? 0;
  const pvp = Number(precio) * (1 + pct / 100);
  const ponerPvp = (v: string) => {
    const n = Number(v.replace(',', '.'));
    if (Number.isFinite(n)) setPrecio((n / (1 + pct / 100)).toFixed(4));
  };
  const attrs = [...atributos, ...Array(Math.max(0, 3 - atributos.length)).fill({ atributo: '', valor: '' })].slice(0, 3);
  return (
    <form action={accion} className="card">
      <Msg e={e} />
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="form-grid">
        <div className="campo"><label>Código principal (SKU) *</label><input name="codigo" defaultValue={p.codigo} required maxLength={25} /></div>
        <div className="campo"><label>Código auxiliar</label><input name="codigo_auxiliar" defaultValue={p.codigo_auxiliar ?? ''} maxLength={25} /></div>
        <div className="campo"><label>Tipo *</label>
          <select name="tipo_producto" defaultValue={p.tipo_producto ?? 1}>{tipos.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}</select>
        </div>
        <div className="campo ancho"><label>Nombre *</label><input name="nombre" defaultValue={p.nombre} required maxLength={300} /></div>
        <div className="campo"><label>IVA *</label>
          <select name="codigo_iva" value={idIva} onChange={(ev) => setIdIva(Number(ev.target.value))}>{iva.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}</select>
        </div>
        <div className="campo"><label>Precio sin IVA *</label><input name="precio" type="number" step="0.0001" min="0.01" value={precio} onChange={(ev) => setPrecio(ev.target.value)} required /></div>
        <div className="campo"><label>P.V.P. con IVA</label>
          <input type="number" step="0.01" min="0" key={`${idIva}-${precio === '' ? 'v' : 'n'}`} defaultValue={precio ? pvp.toFixed(2) : ''} onBlur={(ev) => ponerPvp(ev.target.value)} />
        </div>
        <div className="campo"><label>Costo</label><input name="costo_producto" type="number" step="0.0001" min="0" defaultValue={p.costo_producto != null ? Number(p.costo_producto) : ''} /></div>
        <div className="campo"><label>ICE *</label>
          <select name="codigo_ice" defaultValue={p.codigo_ice ?? 99}>{ice.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}</select>
        </div>
        <div className="campo"><label>IRBPNR *</label>
          <select name="codigo_irbpnr" defaultValue={p.codigo_irbpnr ?? 100}>{irbpnr.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}</select>
        </div>
        <div className="campo"><label>Fecha de elaboración</label><input type="date" name="fecha_elavoracionproducto" defaultValue={p.fecha_elavoracionproducto ?? ''} /></div>
        <div className="campo"><label>Fecha de caducidad</label><input type="date" name="fecha_caducidadproducto" defaultValue={p.fecha_caducidadproducto ?? ''} /></div>
      </div>
      <h3 style={{ marginTop: 16 }}>Atributos adicionales</h3>
      <div className="form-grid">
        {attrs.map((a, i) => (
          <div key={i} className="campo" style={{ flexDirection: 'row', gap: 6 }}>
            <input name={`atributo_${i}`} defaultValue={a.atributo} placeholder="Atributo (ej. Talla)" maxLength={20} />
            <input name={`valor_${i}`} defaultValue={a.valor} placeholder="Valor" maxLength={20} />
          </div>
        ))}
      </div>
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}
