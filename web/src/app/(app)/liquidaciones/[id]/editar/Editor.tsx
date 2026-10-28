'use client';
import { useActionState, useEffect, useState } from 'react';
import {
  actualizarCabecera, agregarLinea, actualizarLinea, eliminarLinea, agregarPago, eliminarPago,
  agregarAdicional, eliminarAdicional, eliminarBorrador, emitirLiquidacion, type Estado,
} from '../../actions';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';
import type { ProductoBusqueda } from '@/app/(app)/comprobantes/busquedas';
import { money, money3 } from '@/lib/formato';

type Opcion = { id: number; texto: string };

function Msg({ e }: { e: Estado }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

export function CabeceraLiquidacion({ id, puntos, valores }: {
  id: number; puntos: Opcion[];
  valores: { id_punto_emision: number; fecha: string; cliente: { id: number; nombre: string; identificacion: string } };
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(actualizarCabecera, {});
  return (
    <form action={accion} className="card">
      <Msg e={e} />
      <input type="hidden" name="id" value={id} />
      <div className="form-grid">
        <div className="campo"><label>Punto de emisión</label>
          <select name="id_punto_emision" defaultValue={valores.id_punto_emision}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
        <div className="campo"><label>Fecha de emisión</label><input type="date" name="fecha_emision" defaultValue={valores.fecha} /></div>
        <SelectorCliente inicial={valores.cliente} etiqueta="Proveedor" />
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar datos generales'}</button></div>
    </form>
  );
}

type Linea = { id: number; codigo: string; nombre: string; adicional: string | null; cantidad: number; pvp: number; descuento_pct: number; sub_total: number; valor_iva: number; total: number };

export function LineasLiquidacion({ id, lineas }: { id: number; lineas: Linea[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarLinea, {});
  const [prod, setProd] = useState<ProductoBusqueda | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  useEffect(() => {
    if (e.ok) setProd(null);
  }, [e]);
  return (
    <div className="card">
      <h2>Productos y servicios</h2>
      <Msg e={e} />
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
          ) : (
            <BuscadorProducto onElegir={setProd} />
          )}
        </div>
        <div className="campo" style={{ minWidth: 90, maxWidth: 110 }}><label>Cantidad</label><input name="cantidad" type="number" min="1" step="1" defaultValue={1} /></div>
        <div className="campo" style={{ minWidth: 110, maxWidth: 130 }}><label>Precio unit. (sin IVA)</label><input name="precio" type="number" step="0.001" min="0" defaultValue={prod ? prod.precio : ''} /></div>
        <div className="campo" style={{ minWidth: 80, maxWidth: 100 }}><label>Desc. %</label><input name="descuento" type="number" step="0.01" min="0" max="100" defaultValue={0} /></div>
        <div className="campo" style={{ minWidth: 160 }}><label>Detalle adicional</label><input name="adicional" maxLength={100} /></div>
        <button className="btn primario" disabled={pend || !prod}>{pend ? 'Agregando…' : 'Agregar'}</button>
      </form>
      {lineas.length > 0 && (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">P. unit.</th><th className="num">Desc. %</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th><th></th></tr></thead>
            <tbody>
              {lineas.map((l) =>
                editando === l.id ? (
                  <FilaEdicion key={l.id} id={id} l={l} onFin={() => setEditando(null)} />
                ) : (
                  <tr key={l.id}>
                    <td className="nowrap">{l.codigo}</td>
                    <td>{l.nombre}{l.adicional ? <div className="muted">{l.adicional}</div> : null}</td>
                    <td className="num">{l.cantidad}</td>
                    <td className="num">{money3(l.pvp)}</td>
                    <td className="num">{l.descuento_pct ? money(l.descuento_pct) : ''}</td>
                    <td className="num">{money(l.sub_total)}</td>
                    <td className="num">{money(l.valor_iva)}</td>
                    <td className="num">{money(l.total)}</td>
                    <td className="nowrap">
                      <button type="button" className="btn chico" onClick={() => setEditando(l.id)}>Editar</button>{' '}
                      <form action={eliminarLinea} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={id} /><input type="hidden" name="id_linea" value={l.id} />
                        <button className="btn chico peligro">Quitar</button>
                      </form>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaEdicion({ id, l, onFin }: { id: number; l: Linea; onFin: () => void }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(async (p: Estado, fd: FormData) => {
    const r = await actualizarLinea(p, fd);
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
      <td className="num"><input form={f} name="precio" type="number" step="0.001" min="0" defaultValue={l.pvp} style={{ width: 90 }} /></td>
      <td className="num"><input form={f} name="descuento" type="number" step="0.01" min="0" max="100" defaultValue={l.descuento_pct} style={{ width: 70 }} /></td>
      <td colSpan={3}></td>
      <td className="nowrap">
        <button form={f} className="btn chico primario" disabled={pend}>Guardar</button>{' '}
        <button type="button" className="btn chico" onClick={onFin}>Cancelar</button>
      </td>
    </tr>
  );
}

export function PagosLiquidacion({ id, formas, tiempos, pagos, pendiente }: {
  id: number; formas: Opcion[]; tiempos: string[]; pagos: { id: number; texto: string; valor: number; plazo: number | null; tiempo: string | null }[]; pendiente: number;
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarPago, {});
  return (
    <div className="card">
      <h2>Formas de pago</h2>
      <Msg e={e} />
      {pagos.map((p) => (
        <div key={p.id} className="acciones" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
          <span>{p.texto}{p.plazo ? ` · ${p.plazo} ${p.tiempo?.toLowerCase()}` : ''}</span>
          <span className="acciones"><strong>{money(p.valor)}</strong>
            <form action={eliminarPago}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_pago" value={p.id} /><button className="btn chico peligro">Quitar</button></form>
          </span>
        </div>
      ))}
      {Math.abs(pendiente) > 0.009 && <p className={pendiente > 0 ? 'muted' : ''} style={{ color: pendiente < 0 ? 'var(--danger)' : undefined }}>{pendiente > 0 ? `Falta asignar $${money(pendiente)}` : `Los pagos superan el total en $${money(-pendiente)}`}</p>}
      <form action={accion} className="filtros" style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={id} />
        <div className="campo busqueda"><label>Forma</label>
          <select name="id_form_pago" defaultValue={formas.find((f) => f.texto.startsWith('01'))?.id}>{formas.map((f) => <option key={f.id} value={f.id}>{f.texto}</option>)}</select>
        </div>
        <div className="campo" style={{ minWidth: 100, maxWidth: 120 }}><label>Valor</label><input name="valor" type="number" step="0.01" min="0" placeholder={pendiente > 0 ? pendiente.toFixed(2) : ''} /></div>
        <div className="campo" style={{ minWidth: 70, maxWidth: 90 }}><label>Plazo</label><input name="plazo" type="number" min="0" /></div>
        <div className="campo" style={{ minWidth: 100, maxWidth: 120 }}><label>Tiempo</label><select name="timpo">{tiempos.map((t) => <option key={t}>{t}</option>)}</select></div>
        <button className="btn" disabled={pend}>Agregar pago</button>
      </form>
    </div>
  );
}

export function AdicionalesLiquidacion({ id, adicionales }: { id: number; adicionales: { id: number; nombre: string; descripcion: string }[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarAdicional, {});
  return (
    <div className="card">
      <h2>Información adicional</h2>
      <Msg e={e} />
      {adicionales.map((a) => (
        <div key={a.id} className="acciones" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
          <span><strong>{a.nombre}:</strong> {a.descripcion}</span>
          <form action={eliminarAdicional}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_adicional" value={a.id} /><button className="btn chico peligro">Quitar</button></form>
        </div>
      ))}
      <form action={accion} className="filtros" style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={id} />
        <div className="campo" style={{ minWidth: 120 }}><label>Nombre</label><input name="nombre" maxLength={50} /></div>
        <div className="campo busqueda"><label>Descripción</label><input name="descripcion" maxLength={300} /></div>
        <button className="btn" disabled={pend}>Agregar</button>
      </form>
    </div>
  );
}

export function BotonesLiquidacion({ id, permitido }: { id: number; permitido: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(emitirLiquidacion, {});
  return (
    <div className="card">
      <Msg e={e} />
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <form action={eliminarBorrador}>
          <input type="hidden" name="id" value={id} />
          <button className="btn peligro" onClick={(ev) => { if (!confirm('¿Eliminar este borrador?')) ev.preventDefault(); }}>Eliminar borrador</button>
        </form>
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <button className="btn primario" disabled={pend || !permitido}
            onClick={(ev) => { if (!confirm('Se asignará el número, se firmará y se enviará al SRI. ¿Continuar?')) ev.preventDefault(); }}>
            {pend ? 'Emitiendo…' : 'Emitir liquidación'}
          </button>
        </form>
      </div>
    </div>
  );
}
