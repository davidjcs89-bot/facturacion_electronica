'use client';
import { useActionState } from 'react';
import {
  actualizarCabecera, agregarMotivo, eliminarMotivo, agregarPago, eliminarPago, agregarAdicional, eliminarAdicional,
  eliminarBorrador, emitirNotaDebito, type Estado,
} from '../../actions';
import { money } from '@/lib/formato';

type Opcion = { id: number; texto: string };

function Msg({ e }: { e: Estado }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

export function CabeceraND({ id, puntos, ivas, valores }: {
  id: number; puntos: Opcion[]; ivas: Opcion[]; valores: { id_punto_emision: number; fecha: string; id_porcentaje_iva: number };
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
        <div className="campo"><label>IVA</label>
          <select name="id_porcentaje_iva" defaultValue={valores.id_porcentaje_iva}>{ivas.map((i) => <option key={i.id} value={i.id}>{i.texto}</option>)}</select>
        </div>
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar datos generales'}</button></div>
    </form>
  );
}

export function MotivosND({ id, motivos }: { id: number; motivos: { id: number; razon: string; valor: number }[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarMotivo, {});
  return (
    <div className="card">
      <h2>Motivos</h2>
      <Msg e={e} />
      <form action={accion} className="filtros">
        <input type="hidden" name="id" value={id} />
        <div className="campo busqueda"><label>Razón de la modificación</label><input name="razon" maxLength={200} /></div>
        <div className="campo" style={{ minWidth: 110, maxWidth: 140 }}><label>Valor (sin IVA)</label><input name="valor" type="number" step="0.01" min="0" /></div>
        <button className="btn primario" disabled={pend}>{pend ? 'Agregando…' : 'Agregar'}</button>
      </form>
      {motivos.length > 0 && (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Razón</th><th className="num">Valor</th><th></th></tr></thead>
            <tbody>
              {motivos.map((m) => (
                <tr key={m.id}>
                  <td>{m.razon}</td>
                  <td className="num">{money(m.valor)}</td>
                  <td><form action={eliminarMotivo}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_motivo" value={m.id} /><button className="btn chico peligro">Quitar</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PagosND({ id, formas, tiempos, pagos, pendiente }: {
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
      {Math.abs(pendiente) > 0.009 && <p className="muted" style={{ color: pendiente < 0 ? 'var(--danger)' : undefined }}>{pendiente > 0 ? `Falta asignar $${money(pendiente)}` : `Los pagos superan el total en $${money(-pendiente)}`}</p>}
      <form action={accion} className="filtros" style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={id} />
        <div className="campo busqueda"><label>Forma</label>
          <select name="id_forma_pago" defaultValue={formas.find((f) => f.texto.startsWith('01'))?.id}>{formas.map((f) => <option key={f.id} value={f.id}>{f.texto}</option>)}</select>
        </div>
        <div className="campo" style={{ minWidth: 100, maxWidth: 120 }}><label>Valor</label><input name="valor" type="number" step="0.01" min="0" placeholder={pendiente > 0 ? pendiente.toFixed(2) : ''} /></div>
        <div className="campo" style={{ minWidth: 70, maxWidth: 90 }}><label>Plazo</label><input name="plazo" type="number" min="0" /></div>
        <div className="campo" style={{ minWidth: 100, maxWidth: 120 }}><label>Tiempo</label><select name="timpo">{tiempos.map((t) => <option key={t}>{t}</option>)}</select></div>
        <button className="btn" disabled={pend}>Agregar pago</button>
      </form>
    </div>
  );
}

export function AdicionalesND({ id, adicionales }: { id: number; adicionales: { id: number; nombre: string; descripcion: string }[] }) {
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

export function BotonesND({ id, permitido }: { id: number; permitido: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(emitirNotaDebito, {});
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
            {pend ? 'Emitiendo…' : 'Emitir nota de débito'}
          </button>
        </form>
      </div>
    </div>
  );
}
