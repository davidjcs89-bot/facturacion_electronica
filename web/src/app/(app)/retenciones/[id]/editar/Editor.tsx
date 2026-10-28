'use client';
import { useActionState, useState } from 'react';
import {
  actualizarCabecera, agregarImpuesto, eliminarImpuesto, agregarAdicional, eliminarAdicional, eliminarBorrador,
  emitirRetencion, type Estado,
} from '../../actions';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { money } from '@/lib/formato';

type Opcion = { id: number; texto: string };

function Msg({ e }: { e: Estado }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

export function CabeceraRetencion({ id, puntos, valores }: {
  id: number; puntos: Opcion[];
  valores: { id_punto_emision: number; fecha: string; sujeto: { id: number; nombre: string; identificacion: string } | null };
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
        <SelectorCliente inicial={valores.sujeto} tipo={2} etiqueta="Sujeto retenido" />
      </div>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar datos generales'}</button></div>
    </form>
  );
}

type Porcentaje = { id: number; id_impuesto: number; texto: string; porcentaje: number; fijo: boolean };
type Detalle = { id: number; doc: string; numero: string; fecha: string; impuesto: string; codigo: string; base: number; porcentaje: number; valor: number };

export function ImpuestosRetencion({ id, hoy, tiposDoc, impuestos, porcentajes, detalles }: {
  id: number; hoy: string; tiposDoc: Opcion[]; impuestos: Opcion[]; porcentajes: Porcentaje[]; detalles: Detalle[];
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarImpuesto, {});
  const [impuesto, setImpuesto] = useState<number>(impuestos.find((i) => /renta/i.test(i.texto))?.id ?? impuestos[0]?.id ?? 0);
  const opciones = porcentajes.filter((p) => p.id_impuesto === impuesto);
  const [idPct, setIdPct] = useState<number>(opciones[0]?.id ?? 0);
  const pct = porcentajes.find((p) => p.id === idPct);
  const [base, setBase] = useState('');
  const [manual, setManual] = useState('');
  const pctAplicado = pct?.fijo ? pct.porcentaje : Number(manual || 0);
  const valor = Math.round(Number(base || 0) * pctAplicado) / 100;
  // valores del ultimo documento sustento para no volver a escribirlos
  const ultimo = detalles[detalles.length - 1];
  const total = detalles.reduce((a, d) => a + d.valor, 0);
  return (
    <div className="card">
      <h2>Impuestos retenidos</h2>
      <Msg e={e} />
      <form action={accion}>
        <input type="hidden" name="id" value={id} />
        <div className="form-grid">
          <div className="campo"><label>Documento sustento</label>
            <select name="id_tipo_documento" defaultValue={1}>{tiposDoc.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}</select>
          </div>
          <div className="campo"><label>Número del documento</label><input name="numero_documento" placeholder="001-001-000000001" defaultValue={ultimo?.numero ?? ''} required /></div>
          <div className="campo"><label>Fecha del documento</label><input type="date" name="fecha_documento" defaultValue={ultimo?.fecha ?? hoy} required /></div>
          <div className="campo"><label>Impuesto</label>
            <select value={impuesto} onChange={(ev) => {
              const v = Number(ev.target.value);
              setImpuesto(v);
              setIdPct(porcentajes.find((p) => p.id_impuesto === v)?.id ?? 0);
            }}>
              {impuestos.map((i) => <option key={i.id} value={i.id}>{i.texto}</option>)}
            </select>
          </div>
          <div className="campo ancho"><label>Código de retención</label>
            <select name="id_porcentaje" value={idPct} onChange={(ev) => setIdPct(Number(ev.target.value))}>
              {opciones.map((p) => <option key={p.id} value={p.id}>{p.texto} ({p.fijo ? `${p.porcentaje}%` : 'porcentaje variable'})</option>)}
            </select>
          </div>
          <div className="campo"><label>Base imponible</label><input name="base_imponible" type="number" step="0.01" min="0" value={base} onChange={(ev) => setBase(ev.target.value)} required /></div>
          <div className="campo"><label>Porcentaje %</label>
            {pct?.fijo ? <input value={pct.porcentaje} disabled /> : <input name="porcentaje" type="number" step="0.01" min="0" max="100" value={manual} onChange={(ev) => setManual(ev.target.value)} />}
          </div>
          <div className="campo"><label>Valor retenido</label><input value={money(valor)} disabled /></div>
        </div>
        <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend || !idPct}>{pend ? 'Agregando…' : 'Agregar impuesto'}</button></div>
      </form>
      {detalles.length > 0 && (
        <div className="tabla-wrap" style={{ marginTop: 14 }}>
          <table className="tabla">
            <thead><tr><th>Documento</th><th>Número</th><th>Fecha</th><th>Impuesto</th><th>Código</th><th className="num">Base</th><th className="num">%</th><th className="num">Retenido</th><th></th></tr></thead>
            <tbody>
              {detalles.map((d) => (
                <tr key={d.id}>
                  <td>{d.doc}</td><td className="nowrap">{d.numero}</td><td className="nowrap">{d.fecha}</td><td>{d.impuesto}</td><td>{d.codigo}</td>
                  <td className="num">{money(d.base)}</td><td className="num">{money(d.porcentaje)}</td><td className="num">{money(d.valor)}</td>
                  <td>
                    <form action={eliminarImpuesto}>
                      <input type="hidden" name="id" value={id} /><input type="hidden" name="id_detalle" value={d.id} />
                      <button className="btn chico peligro">Quitar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={7}>Total retenido</td><td className="num">{money(total)}</td><td></td></tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdicionalesRetencion({ id, adicionales }: { id: number; adicionales: { id: number; nombre: string; descripcion: string }[] }) {
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

export function BotonesRetencion({ id, permitido, total }: { id: number; permitido: boolean; total: number }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(emitirRetencion, {});
  return (
    <div className="card">
      <Msg e={e} />
      <table className="totales" style={{ width: '100%', marginBottom: 12 }}>
        <tbody><tr className="total"><td>Total retenido</td><td className="derecha">${money(total)}</td></tr></tbody>
      </table>
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <form action={eliminarBorrador}>
          <input type="hidden" name="id" value={id} />
          <button className="btn peligro" onClick={(ev) => { if (!confirm('¿Eliminar este borrador?')) ev.preventDefault(); }}>Eliminar borrador</button>
        </form>
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <button className="btn primario" disabled={pend || !permitido}
            onClick={(ev) => { if (!confirm('Se asignará el número, se firmará y se enviará al SRI. ¿Continuar?')) ev.preventDefault(); }}>
            {pend ? 'Emitiendo…' : 'Emitir retención'}
          </button>
        </form>
      </div>
    </div>
  );
}
