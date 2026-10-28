'use client';
import { useActionState } from 'react';
import { crearNotaCredito, type Estado } from '../actions';

type Linea = { id: number; codigo: string; nombre: string; adicional: string | null; cantidad: number; disponible: number; precio: string; total: string };

export function FormNuevaNC({ idFactura, hoy, puntoDefecto, puntos, lineas }: {
  idFactura: number; hoy: string; puntoDefecto: number; puntos: { id: number; texto: string }[]; lineas: Linea[];
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(crearNotaCredito, {});
  return (
    <form action={accion}>
      <input type="hidden" name="id_factura" value={idFactura} />
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <div className="card">
        <div className="form-grid">
          <div className="campo"><label>Punto de emisión *</label>
            <select name="id_punto_emision" defaultValue={puntoDefecto}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
          </div>
          <div className="campo"><label>Fecha de emisión *</label><input type="date" name="fecha_emision" defaultValue={hoy} required /></div>
          <div className="campo ancho"><label>Motivo *</label><input name="motivo" maxLength={200} required placeholder="Ej.: DEVOLUCIÓN DE MERCADERÍA" /></div>
        </div>
      </div>
      <div className="card sin-padding">
        <div style={{ padding: '14px 16px 0' }}><h2>Productos a acreditar</h2></div>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th></th><th>Código</th><th>Descripción</th><th className="num">Facturado</th><th className="num">Disponible</th><th className="num">P. unitario</th><th className="num">Total línea</th><th className="num">Cantidad a acreditar</th></tr></thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.id}>
                  <td><input type="checkbox" name={`sel_${l.id}`} defaultChecked={l.disponible > 0} disabled={l.disponible <= 0} /></td>
                  <td className="nowrap">{l.codigo}</td>
                  <td>{l.nombre}{l.adicional && l.adicional !== l.nombre ? <div className="muted">{l.adicional}</div> : null}</td>
                  <td className="num">{l.cantidad}</td>
                  <td className="num">{l.disponible}</td>
                  <td className="num">{l.precio}</td>
                  <td className="num">{l.total}</td>
                  <td className="num"><input type="number" name={`cant_${l.id}`} min={1} max={Math.max(l.disponible, 1)} step={1} defaultValue={Math.max(l.disponible, 0)} disabled={l.disponible <= 0} style={{ width: 90 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="acciones"><button className="btn primario" disabled={pend}>{pend ? 'Creando…' : 'Crear nota de crédito'}</button></div>
    </form>
  );
}
