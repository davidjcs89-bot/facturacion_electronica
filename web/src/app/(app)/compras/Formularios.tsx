'use client';
import { useActionState, useState } from 'react';
import { leerXml, guardarCompraXml, guardarCompraManual, anularCompra, type EstadoXml, type EstadoForm } from './actions';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { money } from '@/lib/formato';

type Bodega = { id: number; nombre: string };

export function ImportarXml({ bodegas }: { bodegas: Bodega[] }) {
  const [e1, leer, p1] = useActionState<EstadoXml, FormData>(leerXml, {});
  const [e2, guardar, p2] = useActionState<EstadoXml, FormData>(guardarCompraXml, {});
  const f = e1.factura;
  return (
    <>
      <form action={leer} className="card">
        <h2>1. Archivo XML de la factura del proveedor</h2>
        {e1.mensaje && <div className="alerta error">{e1.mensaje}</div>}
        <div className="filtros">
          <div className="campo busqueda"><label>XML autorizado (descargado del SRI o recibido por correo)</label><input type="file" name="archivo" accept=".xml,text/xml" required /></div>
          <button className="btn" disabled={p1}>{p1 ? 'Leyendo…' : 'Leer XML'}</button>
        </div>
      </form>
      {f && (
        <form action={guardar}>
          <input type="hidden" name="factura" value={JSON.stringify(f)} />
          <div className="card">
            <h2>2. Revisar y guardar</h2>
            {e2.mensaje && <div className="alerta error">{e2.mensaje}</div>}
            <dl className="datos" style={{ marginBottom: 12 }}>
              <dt>Proveedor</dt><dd>{f.razonSocial} · RUC {f.ruc}</dd>
              <dt>Factura</dt><dd>{f.numero} del {f.fechaEmision.split('-').reverse().join('/')}</dd>
              <dt>Total</dt><dd>${money(f.total)} (sin impuestos ${money(f.totalSinImpuestos)})</dd>
            </dl>
            <div className="form-grid">
              <div className="campo"><label>Bodega de ingreso *</label><select name="id_bodega">{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
              <div className="campo check" style={{ alignSelf: 'end' }}><input type="checkbox" id="act" name="actualizar_productos" /><label htmlFor="act">Actualizar nombre y precio de productos existentes</label></div>
            </div>
          </div>
          <div className="card sin-padding">
            <div className="tabla-wrap">
              <table className="tabla">
                <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">Costo unit.</th><th className="num">Subtotal</th><th>Producto</th><th className="num">Precio venta (sin IVA)</th></tr></thead>
                <tbody>{f.detalles.map((d, k) => {
                  const ex = e1.existentes?.[d.codigo];
                  return (
                    <tr key={k}>
                      <td className="nowrap">{d.codigo}</td><td>{d.descripcion}</td><td className="num">{d.cantidad}</td>
                      <td className="num">{money(d.precioUnitario)}</td><td className="num">{money(d.precioTotalSinImpuesto)}</td>
                      <td>{ex ? <span className="badge e4">Existe</span> : <span className="badge e6">Nuevo</span>}</td>
                      <td className="num"><input name={`pv_${k}`} type="number" step="0.0001" min="0" defaultValue={ex ? ex.precio : d.precioUnitario} style={{ width: 110 }} /></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
          <button className="btn primario" disabled={p2 || !bodegas.length}>{p2 ? 'Guardando…' : 'Guardar compra e ingresar al inventario'}</button>
        </form>
      )}
    </>
  );
}

type Linea = { id_producto: number; codigo: string; nombre: string; cantidad: number; costo: number; iva: number };

export function CompraManual({ bodegas, hoy }: { bodegas: Bodega[]; hoy: string }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(guardarCompraManual, {});
  const [lineas, setLineas] = useState<Linea[]>([]);
  const sub = lineas.reduce((a, l) => a + l.cantidad * l.costo, 0);
  const iva = lineas.reduce((a, l) => a + Math.round(l.cantidad * l.costo * l.iva) / 100, 0);
  const upd = (i: number, cambio: Partial<Linea>) => setLineas(lineas.map((x, k) => (k === i ? { ...x, ...cambio } : x)));
  return (
    <form action={act}>
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <input type="hidden" name="lineas" value={JSON.stringify(lineas.map((l) => ({ id_producto: l.id_producto, cantidad: l.cantidad, costo: l.costo })))} />
      <div className="card">
        <div className="form-grid">
          <div className="campo"><label>N.º factura proveedor *</label><input name="numero" placeholder="001-001-000000123" maxLength={20} /></div>
          <div className="campo"><label>Fecha *</label><input type="date" name="fecha" defaultValue={hoy} /></div>
          <div className="campo"><label>Bodega *</label><select name="id_bodega">{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          <div className="campo"><label>Clave de acceso / autorización</label><input name="clave" maxLength={100} /></div>
          <SelectorCliente inicial={null} tipo={4} etiqueta="Proveedor" />
        </div>
      </div>
      <div className="card">
        <h2>Productos</h2>
        <div className="filtros"><div className="campo busqueda"><label>Agregar producto</label>
          <BuscadorProducto onElegir={(p) => setLineas([...lineas, { id_producto: p.id, codigo: p.codigo, nombre: p.nombre, cantidad: 1, costo: 0, iva: Number(p.iva_pct) }])} />
        </div></div>
        {lineas.length > 0 && (
          <table className="tabla">
            <thead><tr><th>Código</th><th>Producto</th><th className="num">Cantidad</th><th className="num">Costo unit. (sin IVA)</th><th className="num">Subtotal</th><th></th></tr></thead>
            <tbody>{lineas.map((l, i) => (
              <tr key={i}>
                <td>{l.codigo}</td><td>{l.nombre}</td>
                <td className="num"><input type="number" min={1} step={1} value={l.cantidad} style={{ width: 80 }} onChange={(ev) => upd(i, { cantidad: Math.max(1, parseInt(ev.target.value || '1', 10)) })} /></td>
                <td className="num"><input type="number" min={0} step="0.0001" value={l.costo} style={{ width: 110 }} onChange={(ev) => upd(i, { costo: Number(ev.target.value) || 0 })} /></td>
                <td className="num">{money(l.cantidad * l.costo)}</td>
                <td><button type="button" className="btn chico peligro" onClick={() => setLineas(lineas.filter((_, k) => k !== i))}>Quitar</button></td>
              </tr>))}
            </tbody>
            <tfoot><tr><td colSpan={4} className="derecha">Subtotal / IVA / Total</td><td className="num">{money(sub)} / {money(iva)} / {money(sub + iva)}</td><td></td></tr></tfoot>
          </table>
        )}
      </div>
      <button className="btn primario" disabled={pend || !lineas.length}>{pend ? 'Guardando…' : 'Guardar compra'}</button>
    </form>
  );
}

export function BotonAnular({ id }: { id: number }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(anularCompra, {});
  return (
    <form action={act}>
      {e.mensaje && <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>}
      <input type="hidden" name="id" value={id} />
      <button className="btn peligro" disabled={pend} onClick={(ev) => { if (!confirm('¿Anular la compra y descontar su stock?')) ev.preventDefault(); }}>Anular compra</button>
    </form>
  );
}
