'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import {
  actualizarDatosFactura, actualizarClienteFactura, agregarLinea, actualizarLinea, eliminarLinea, agregarPago, eliminarPago,
  agregarAdicional, eliminarAdicional, eliminarBorrador, emitirFactura, type Estado,
} from '../../actions';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';
import type { ProductoBusqueda } from '@/app/(app)/comprobantes/busquedas';
import { money } from '@/lib/formato';

type Opcion = { id: number; texto: string };

function Msg({ e }: { e: Estado }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

/** Indicador discreto de guardado automatico */
function Guardado({ e, pend }: { e: Estado; pend: boolean }) {
  if (pend) return <span className="muted" style={{ fontSize: '0.85rem' }}>Guardando…</span>;
  if (e.mensaje && !e.ok) return <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{e.mensaje}</span>;
  if (e.ok) return <span style={{ color: 'var(--ok)', fontSize: '0.85rem' }}>✓ Guardado</span>;
  return null;
}

/** Parte 1: punto de emision, fecha y guia. Contraida muestra solo punto y fecha; se guarda sola al cambiar. */
export function DatosFactura({ id, puntos, valores }: {
  id: number; puntos: Opcion[];
  valores: { id_punto_emision: number; fecha: string; guia: string };
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(actualizarDatosFactura, {});
  const form = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [punto, setPunto] = useState(valores.id_punto_emision);
  const [fecha, setFecha] = useState(valores.fecha);
  const guardar = () => setTimeout(() => form.current?.requestSubmit(), 0);
  const textoPunto = puntos.find((p) => p.id === punto)?.texto.split(' · ')[0] ?? '—';
  const textoFecha = fecha ? fecha.split('-').reverse().join('/') : '—';
  return (
    <form action={accion} className="card" ref={form}>
      <input type="hidden" name="id" value={id} />
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{abierto ? '▾' : '▸'} 1. Datos de la factura</h2>
          {!abierto && <span className="muted">Punto {textoPunto} · Fecha {textoFecha}{valores.guia ? ` · Guía ${valores.guia}` : ''}</span>}
        </button>
        <span className="acciones">
          <Guardado e={e} pend={pend} />
          <button type="button" className="btn chico" onClick={() => setAbierto(!abierto)}>{abierto ? 'Ocultar' : 'Cambiar'}</button>
        </span>
      </div>
      <div className="form-grid" style={{ marginTop: 12, display: abierto ? undefined : 'none' }}>
        <div className="campo"><label>Punto de emisión</label>
          <select name="id_punto_emision" value={punto} onChange={(ev) => { setPunto(Number(ev.target.value)); guardar(); }}>
            {puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
          </select>
        </div>
        <div className="campo"><label>Fecha de emisión</label>
          <input type="date" name="fecha_emision" value={fecha} onChange={(ev) => setFecha(ev.target.value)} onBlur={guardar} />
        </div>
        <div className="campo"><label>Guía de remisión (opcional)</label>
          <input name="guia_de_remision" defaultValue={valores.guia} placeholder="001-001-000000001" onBlur={(ev) => { if (ev.target.value !== valores.guia) guardar(); }} />
        </div>
      </div>
    </form>
  );
}

/** Parte 2: cliente (nombre, identificacion, direccion, telefono y correo). Se guarda solo al elegirlo. */
export function ClienteFactura({ id, cliente }: { id: number; cliente: { id: number; nombre: string; identificacion: string } }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(actualizarClienteFactura, {});
  const form = useRef<HTMLFormElement>(null);
  return (
    <form action={accion} className="card" ref={form}>
      <input type="hidden" name="id" value={id} />
      <div className="acciones" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>2. Datos del cliente</h2>
        <Guardado e={e} pend={pend} />
      </div>
      <div className="form-grid">
        <SelectorCliente inicial={cliente} tipo={1} permitirConsumidorFinal
          onCambio={(idC) => { if (idC) setTimeout(() => form.current?.requestSubmit(), 0); }} />
      </div>
    </form>
  );
}

type Linea = { id: number; codigo: string; nombre: string; adicional: string | null; cantidad: number; pvp: number; descuento_pct: number; sub_total: number; valor_iva: number; total: number };

export function LineasFactura({ id, lineas }: { id: number; lineas: Linea[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarLinea, {});
  const [prod, setProd] = useState<ProductoBusqueda | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  useEffect(() => {
    if (e.ok) setProd(null);
  }, [e]);
  return (
    <div className="card">
      <h2>3. Detalle: productos y servicios</h2>
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
        <div className="campo" style={{ minWidth: 110, maxWidth: 130 }}><label>P.V.P. (con IVA)</label><input name="precio" type="number" step="0.01" min="0" defaultValue={prod ? prod.pvp : ''} /></div>
        <div className="campo" style={{ minWidth: 80, maxWidth: 100 }}><label>Desc. %</label><input name="descuento" type="number" step="0.01" min="0" max="100" defaultValue={0} /></div>
        <div className="campo" style={{ minWidth: 160 }}><label>Detalle adicional</label><input name="adicional" maxLength={100} /></div>
        <button className="btn primario" disabled={pend || !prod}>{pend ? 'Agregando…' : 'Agregar'}</button>
      </form>
      {lineas.length === 0 && <p className="muted">Todavía no hay productos. Búsquelo arriba por código o nombre, indique la cantidad y pulse «Agregar».</p>}
      {lineas.length > 0 && (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr>
              <th>Descripción</th><th>Código</th><th className="num">Cant.</th><th className="num">P.V.P. con IVA</th><th className="num">Desc.</th>
              <th className="num">P.V.P. con desc.</th><th className="num">Subtotal sin imp.</th><th className="num">IVA</th><th className="num">Total</th><th></th>
            </tr></thead>
            <tbody>
              {lineas.map((l) =>
                editando === l.id ? (
                  <FilaEdicion key={l.id} id={id} l={l} onFin={() => setEditando(null)} />
                ) : (
                  <tr key={l.id}>
                    <td>{l.nombre}{l.adicional ? <div className="muted">{l.adicional}</div> : null}</td>
                    <td className="nowrap">{l.codigo}</td>
                    <td className="num">{l.cantidad}</td>
                    <td className="num">{money(l.pvp)}</td>
                    <td className="num">{l.descuento_pct ? `${money(l.descuento_pct)}%` : '—'}</td>
                    <td className="num">{money(Math.round(l.pvp * (1 - l.descuento_pct / 100) * 100) / 100)}</td>
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
      <td>
        {l.nombre}
        <form id={f} action={accion}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_linea" value={l.id} /></form>
        <input form={f} name="adicional" defaultValue={l.adicional ?? ''} placeholder="Detalle adicional" style={{ marginTop: 4 }} />
        {e.mensaje && !e.ok && <div className="alerta error" style={{ marginTop: 4 }}>{e.mensaje}</div>}
      </td>
      <td className="nowrap">{l.codigo}</td>
      <td className="num"><input form={f} name="cantidad" type="number" min="1" step="1" defaultValue={l.cantidad} style={{ width: 70 }} /></td>
      <td className="num"><input form={f} name="precio" type="number" step="0.01" min="0" defaultValue={l.pvp} style={{ width: 90 }} /></td>
      <td className="num"><input form={f} name="descuento" type="number" step="0.01" min="0" max="100" defaultValue={l.descuento_pct} style={{ width: 70 }} /></td>
      <td colSpan={4}></td>
      <td className="nowrap">
        <button form={f} className="btn chico primario" disabled={pend}>Guardar</button>{' '}
        <button type="button" className="btn chico" onClick={onFin}>Cancelar</button>
      </td>
    </tr>
  );
}

export function PagosFactura({ id, formas, tiempos, pagos, pendiente }: {
  id: number; formas: Opcion[]; tiempos: string[]; pagos: { id: number; texto: string; valor: number; plazo: number | null; tiempo: string | null }[]; pendiente: number;
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarPago, {});
  const [masPago, setMasPago] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h2>4. Forma de pago</h2>
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
      <form action={accion} style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={id} />
        <div className="campo"><label>Forma</label>
          <select name="id_form_pago" defaultValue={formas.find((f) => f.texto.startsWith('01'))?.id}>{formas.map((f) => <option key={f.id} value={f.id}>{f.texto}</option>)}</select>
        </div>
        {/* Valor, plazo y tiempo quedan contraidos: el valor ya viene con lo que falta por pagar */}
        <div className="filtros" style={{ marginTop: 10, marginBottom: 0, display: masPago ? undefined : 'none' }}>
          <div className="campo" style={{ minWidth: 100, flex: 1 }}><label>Valor</label><input name="valor" type="number" step="0.01" min="0" key={pendiente} defaultValue={pendiente > 0 ? pendiente.toFixed(2) : ''} /></div>
          <div className="campo" style={{ minWidth: 70, flex: 1 }}><label>Plazo</label><input name="plazo" type="number" min="0" /></div>
          <div className="campo" style={{ minWidth: 100, flex: 1 }}><label>Tiempo</label><select name="timpo">{tiempos.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div className="acciones" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <button type="button" className="btn chico" onClick={() => setMasPago(!masPago)} aria-expanded={masPago}>
            {masPago ? '▾ Ocultar valor y plazo' : `▸ Valor${pendiente > 0 ? ` $${money(pendiente)}` : ''} y plazo`}
          </button>
          <button className="btn" disabled={pend}>{pend ? 'Agregando…' : 'Agregar pago'}</button>
        </div>
      </form>
    </div>
  );
}

export function AdicionalesFactura({ id, adicionales }: { id: number; adicionales: { id: number; nombre: string; descripcion: string }[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarAdicional, {});
  const [nombre, setNombre] = useState('');
  useEffect(() => {
    if (e.ok) setNombre('');
  }, [e]);
  const abierto = nombre.trim().length > 0;
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h2>5. Información adicional <span className="muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span></h2>
      <Msg e={e} />
      {adicionales.map((a) => (
        <div key={a.id} className="acciones" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
          <span><strong>{a.nombre}:</strong> {a.descripcion}</span>
          <form action={eliminarAdicional}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_adicional" value={a.id} /><button className="btn chico peligro">Quitar</button></form>
        </div>
      ))}
      <form action={accion} style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={id} />
        <div className="campo"><label>Nombre</label>
          <input name="nombre" maxLength={50} value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Ej.: Vendedor, Orden de compra" />
        </div>
        {/* La descripcion aparece al escribir el nombre */}
        <div style={{ display: abierto ? undefined : 'none' }}>
          <div className="campo" style={{ marginTop: 10 }}><label>Descripción</label><input name="descripcion" maxLength={300} /></div>
          <div className="acciones" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn" disabled={pend}>{pend ? 'Agregando…' : 'Agregar'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export type Requisito = { ok: boolean; texto: string };

/** Lista de lo que falta para emitir + botones de emitir / eliminar borrador */
export function BotonesFactura({ id, permitido, requisitos }: { id: number; permitido: boolean; requisitos: Requisito[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(emitirFactura, {});
  const listo = requisitos.every((r) => r.ok);
  return (
    <div className="card">
      <h2>Revisar y emitir</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'grid', gap: 6 }}>
        {requisitos.map((r) => (
          <li key={r.texto} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span aria-hidden style={{ fontWeight: 700, color: r.ok ? 'var(--ok, #1a7f37)' : 'var(--danger)' }}>{r.ok ? '✓' : '✗'}</span>
            <span style={{ color: r.ok ? undefined : 'var(--danger)' }}>{r.texto}</span>
          </li>
        ))}
      </ul>
      <Msg e={e} />
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <form action={eliminarBorrador}>
          <input type="hidden" name="id" value={id} />
          <button className="btn peligro" onClick={(ev) => { if (!confirm('¿Eliminar este borrador?')) ev.preventDefault(); }}>Eliminar borrador</button>
        </form>
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <button className="btn primario" disabled={pend || !permitido || !listo} title={!listo ? 'Complete lo marcado con ✗' : undefined}
            onClick={(ev) => { if (!confirm('Se asignará el número, se firmará y se enviará al SRI. ¿Continuar?')) ev.preventDefault(); }}>
            {pend ? 'Emitiendo…' : 'Emitir factura'}
          </button>
        </form>
      </div>
      {!listo && <p className="muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>El botón se habilita cuando todo esté en ✓.</p>}
    </div>
  );
}
