'use client';
import { useActionState, useEffect, useState } from 'react';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';
import type { ProductoBusqueda } from '@/app/(app)/comprobantes/busquedas';
import { money } from '@/lib/formato';

export type EstadoForm = { ok?: boolean; mensaje?: string };
type Accion = (p: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export type LineaVista = { id: number; codigo: string; nombre: string; adicional: string | null; cantidad: number; pvp: number; descuento_pct: number; sub_total: number; valor_iva: number; total: number };

export function Msg({ e }: { e: EstadoForm }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

/** Editor de lineas reutilizable (proformas y pedidos) */
export function EditorLineas({ id, lineas, editable, agregar, actualizar, eliminar }: {
  id: number; lineas: LineaVista[]; editable: boolean; agregar: Accion; actualizar: Accion; eliminar: (fd: FormData) => Promise<void>;
}) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(agregar, {});
  const [prod, setProd] = useState<ProductoBusqueda | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  useEffect(() => { if (e.ok) setProd(null); }, [e]);
  return (
    <div className="card">
      <h2>Productos y servicios</h2>
      <Msg e={e} />
      {editable && (
        <form action={accion} className="filtros" key={prod?.id ?? 'nuevo'}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="id_producto" value={prod?.id ?? ''} />
          <div className="campo busqueda">
            <label>Producto</label>
            {prod ? (
              <div className="acciones" style={{ justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
                <span><strong>{prod.codigo}</strong> · {prod.nombre}</span>
                <button type="button" className="btn chico" onClick={() => setProd(null)}>Cambiar</button>
              </div>
            ) : <BuscadorProducto onElegir={setProd} />}
          </div>
          <div className="campo" style={{ minWidth: 90, maxWidth: 110 }}><label>Cantidad</label><input name="cantidad" type="number" min="1" step="1" defaultValue={1} /></div>
          <div className="campo" style={{ minWidth: 110, maxWidth: 130 }}><label>P.V.P. (con IVA)</label><input name="precio" type="number" step="0.01" min="0" defaultValue={prod ? prod.pvp : ''} /></div>
          <div className="campo" style={{ minWidth: 80, maxWidth: 100 }}><label>Desc. %</label><input name="descuento" type="number" step="0.01" min="0" max="100" defaultValue={0} /></div>
          <div className="campo" style={{ minWidth: 160 }}><label>Detalle adicional</label><input name="adicional" maxLength={100} /></div>
          <button className="btn primario" disabled={pend || !prod}>{pend ? 'Agregando…' : 'Agregar'}</button>
        </form>
      )}
      {lineas.length > 0 ? (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">P.V.P.</th><th className="num">Desc. %</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th>{editable && <th></th>}</tr></thead>
            <tbody>
              {lineas.map((l) => editando === l.id ? (
                <FilaEdicion key={l.id} id={id} l={l} actualizar={actualizar} onFin={() => setEditando(null)} />
              ) : (
                <tr key={l.id}>
                  <td className="nowrap">{l.codigo}</td>
                  <td>{l.nombre}{l.adicional ? <div className="muted">{l.adicional}</div> : null}</td>
                  <td className="num">{l.cantidad}</td>
                  <td className="num">{money(l.pvp)}</td>
                  <td className="num">{l.descuento_pct ? money(l.descuento_pct) : ''}</td>
                  <td className="num">{money(l.sub_total)}</td>
                  <td className="num">{money(l.valor_iva)}</td>
                  <td className="num">{money(l.total)}</td>
                  {editable && (
                    <td className="nowrap">
                      <button type="button" className="btn chico" onClick={() => setEditando(l.id)}>Editar</button>{' '}
                      <form action={eliminar} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={id} /><input type="hidden" name="id_linea" value={l.id} />
                        <button className="btn chico peligro">Quitar</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">Sin productos.</p>}
    </div>
  );
}

function FilaEdicion({ id, l, actualizar, onFin }: { id: number; l: LineaVista; actualizar: Accion; onFin: () => void }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(async (p: EstadoForm, fd: FormData) => {
    const r = await actualizar(p, fd);
    if (r.ok) onFin();
    return r;
  }, {});
  const f = `edit-${l.id}`;
  return (
    <tr>
      <td className="nowrap">{l.codigo}</td>
      <td>
        {l.nombre}
        <form id={f} action={accion}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_linea" value={l.id} /></form>
        <input form={f} name="adicional" defaultValue={l.adicional ?? ''} placeholder="Detalle adicional" style={{ marginTop: 4 }} />
        {e.mensaje && !e.ok && <div className="alerta error" style={{ marginTop: 4 }}>{e.mensaje}</div>}
      </td>
      <td className="num"><input form={f} name="cantidad" type="number" min="1" step="1" defaultValue={l.cantidad} style={{ width: 70 }} /></td>
      <td className="num"><input form={f} name="precio" type="number" step="0.01" min="0" defaultValue={l.pvp} style={{ width: 90 }} /></td>
      <td className="num"><input form={f} name="descuento" type="number" step="0.01" min="0" max="100" defaultValue={l.descuento_pct} style={{ width: 70 }} /></td>
      <td colSpan={3}></td>
      <td className="nowrap">
        <button form={f} className="btn chico primario" disabled={pend}>Guardar</button>{' '}
        <button type="button" className="btn chico" onClick={onFin}>Cancelar</button>
      </td>
    </tr>
  );
}

/** Formulario: convertir a factura eligiendo punto de emision */
export function FormConvertir({ id, puntos, accion }: { id: number; puntos: { id: number; texto: string }[]; accion: Accion }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(accion, {});
  return (
    <form action={act} className="card">
      <h2>Convertir a factura</h2>
      <Msg e={e} />
      <input type="hidden" name="id" value={id} />
      <div className="filtros">
        <div className="campo busqueda"><label>Punto de emisión</label>
          <select name="id_punto_emision">{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
        <button className="btn primario" disabled={pend || !puntos.length}>{pend ? 'Creando…' : 'Crear factura'}</button>
      </div>
    </form>
  );
}

/** Formulario: enviar PDF por correo */
export function FormCorreo({ id, correo, accion }: { id: number; correo: string | null; accion: Accion }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(accion, {});
  return (
    <form action={act} className="card">
      <h2>Enviar por correo</h2>
      <Msg e={e} />
      <input type="hidden" name="id" value={id} />
      <div className="filtros">
        <div className="campo busqueda"><label>Correo(s)</label><input name="correo" defaultValue={correo?.toLowerCase() ?? ''} /></div>
        <button className="btn" disabled={pend}>{pend ? 'Enviando…' : 'Enviar'}</button>
      </div>
    </form>
  );
}
