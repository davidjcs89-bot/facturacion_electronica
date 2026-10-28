'use client';
import { useActionState } from 'react';
import { actualizarCabecera, guardarLinea, eliminarLinea, agregarAdicional, eliminarAdicional, eliminarBorrador, emitirNotaCredito, type Estado } from '../../actions';

type Opcion = { id: number; texto: string };

function Msg({ e }: { e: Estado }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

export function CabeceraNC({ id, puntos, valores }: { id: number; puntos: Opcion[]; valores: { id_punto_emision: number; fecha: string; motivo: string } }) {
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
        <div className="campo ancho"><label>Motivo *</label><input name="motivo" defaultValue={valores.motivo} maxLength={200} required /></div>
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar datos generales'}</button></div>
    </form>
  );
}

type Linea = { id: number; id_producto: number; codigo: string; nombre: string; cantidad: number; precio: string; descuento: string; subtotal: string; iva: string; total: string };
type Origen = { id: number; id_producto: number; texto: string; disponible: number };

export function LineasNC({ id, lineas, origen }: { id: number; lineas: Linea[]; origen: Origen[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(guardarLinea, {});
  const disponibles = origen.filter((o) => o.disponible > 0);
  return (
    <div className="card">
      <h2>Productos acreditados</h2>
      <Msg e={e} />
      <p className="muted" style={{ marginTop: 0 }}>Para cambiar la cantidad de un producto, elíjalo e ingrese la nueva cantidad.</p>
      {disponibles.length > 0 && (
        <form action={accion} className="filtros">
          <input type="hidden" name="id" value={id} />
          <div className="campo busqueda"><label>Producto de la factura</label>
            <select name="id_detalle_factura">{disponibles.map((o) => <option key={o.id} value={o.id}>{o.texto} (disponible {o.disponible})</option>)}</select>
          </div>
          <div className="campo" style={{ minWidth: 90, maxWidth: 120 }}><label>Cantidad</label><input name="cantidad" type="number" min="1" step="1" defaultValue={1} /></div>
          <button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Agregar / actualizar'}</button>
        </form>
      )}
      {lineas.length > 0 && (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cant.</th><th className="num">P. unitario</th><th className="num">Desc.</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th><th></th></tr></thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.id}>
                  <td className="nowrap">{l.codigo}</td>
                  <td>{l.nombre}</td>
                  <td className="num">{l.cantidad}</td>
                  <td className="num">{l.precio}</td>
                  <td className="num">{l.descuento}</td>
                  <td className="num">{l.subtotal}</td>
                  <td className="num">{l.iva}</td>
                  <td className="num">{l.total}</td>
                  <td>
                    <form action={eliminarLinea}>
                      <input type="hidden" name="id" value={id} /><input type="hidden" name="id_linea" value={l.id} />
                      <button className="btn chico peligro">Quitar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdicionalesNC({ id, adicionales }: { id: number; adicionales: { id: number; nombre: string; descripcion: string }[] }) {
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

export function BotonesNC({ id, permitido }: { id: number; permitido: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(emitirNotaCredito, {});
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
            {pend ? 'Emitiendo…' : 'Emitir nota de crédito'}
          </button>
        </form>
      </div>
    </div>
  );
}
