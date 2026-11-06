'use client';
import { useActionState, useState } from 'react';
import { copiarRetencion, importarFacturaProveedor, type EstadoImportar } from '../importar';

type Opcion = { id: number; texto: string };

/** Crear la retencion desde la factura del proveedor: clave de acceso (se trae del SRI) o archivo XML */
export function DesdeFacturaProveedor({ puntos }: { puntos: Opcion[] }) {
  const [e, accion, pend] = useActionState<EstadoImportar, FormData>(importarFacturaProveedor, {});
  const [modo, setModo] = useState<'clave' | 'xml'>('clave');
  return (
    <form action={accion} className="card">
      <h2>Desde la factura del proveedor</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
        Se llenan solos el proveedor (se crea si no existe), el número y la fecha de la factura, el subtotal y el IVA.
        Usted solo elige los códigos de retención.
      </p>
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <div className="acciones" style={{ marginBottom: 10 }}>
        <button type="button" className={`btn chico${modo === 'clave' ? ' primario' : ''}`} onClick={() => setModo('clave')}>Clave de acceso</button>
        <button type="button" className={`btn chico${modo === 'xml' ? ' primario' : ''}`} onClick={() => setModo('xml')}>Subir XML</button>
      </div>
      <div className="form-grid">
        {modo === 'clave' ? (
          <div className="campo ancho" style={{ gridColumn: '1 / -1' }}><label>Clave de acceso de la factura (49 dígitos)</label>
            <input name="clave" inputMode="numeric" autoComplete="off" placeholder="Está en el RIDE de la factura, debajo de «Número de autorización»" />
          </div>
        ) : (
          <div className="campo ancho" style={{ gridColumn: '1 / -1' }}><label>Archivo XML de la factura</label>
            <input name="xml" type="file" accept=".xml,text/xml,application/xml" />
          </div>
        )}
        <div className="campo"><label>Punto de emisión de la retención</label>
          <select name="id_punto_emision" defaultValue={puntos[0]?.id}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
        </div>
      </div>
      <div className="acciones" style={{ marginTop: 12 }}>
        <button className="btn primario" disabled={pend}>{pend ? (modo === 'clave' ? 'Consultando al SRI…' : 'Leyendo el XML…') : 'Importar y continuar'}</button>
      </div>
    </form>
  );
}

/** Copiar una retencion anterior a un borrador nuevo */
export function CopiarRetencion({ recientes }: { recientes: Opcion[] }) {
  const [e, accion, pend] = useActionState<EstadoImportar, FormData>(copiarRetencion, {});
  return (
    <form action={accion} className="card">
      <h2>Copiar una retención anterior</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
        Copia el sujeto retenido, los impuestos y los datos adicionales. Los porcentajes se actualizan a los vigentes.
      </p>
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      {recientes.length === 0 ? (
        <p className="muted">Todavía no hay retenciones para copiar.</p>
      ) : (
        <>
          <div className="campo"><label>Retención</label>
            <select name="id_origen" defaultValue={recientes[0]?.id}>{recientes.map((r) => <option key={r.id} value={r.id}>{r.texto}</option>)}</select>
          </div>
          <div className="acciones" style={{ marginTop: 12 }}>
            <button className="btn primario" disabled={pend}>{pend ? 'Copiando…' : 'Copiar y continuar'}</button>
          </div>
        </>
      )}
    </form>
  );
}

/** Boton «Duplicar» para la pantalla de una retencion */
export function BotonDuplicar({ id }: { id: number }) {
  const [e, accion, pend] = useActionState<EstadoImportar, FormData>(copiarRetencion, {});
  return (
    <form action={accion} style={{ display: 'inline' }}>
      <input type="hidden" name="id_origen" value={id} />
      <button className="btn" disabled={pend} title={e.mensaje}>{pend ? 'Duplicando…' : 'Duplicar'}</button>
    </form>
  );
}
