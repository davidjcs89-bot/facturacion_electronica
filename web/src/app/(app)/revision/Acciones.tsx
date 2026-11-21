'use client';
import { useActionState, useState } from 'react';
import { consultarSri, anularEnSistema, borradorConFechaDeHoy, copiarComoNueva, corregirIva, type Resultado } from './actions';

function Msg({ r }: { r: Resultado }) {
  if (!r.mensaje) return null;
  return <div className={`alerta ${r.ok ? 'ok' : 'error'}`} style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.mensaje}</div>;
}

/** Opciones para un comprobante antiguo con problema. Nada se envía al SRI: la persona decide. */
export function AccionesComprobante({ tipo, id, ruta, borrador, tieneClave, mensaje }: {
  tipo: number; id: number; ruta: string; borrador: boolean; tieneClave: boolean; mensaje: string | null;
}) {
  const [rC, fC, pC] = useActionState<Resultado, FormData>(consultarSri, {});
  const [rA, fA, pA] = useActionState<Resultado, FormData>(anularEnSistema, {});
  const [verError, setVerError] = useState(false);
  const ocultos = <><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={id} /></>;
  return (
    <div className="acciones-revision">
      <div className="acciones">
        <a className="btn chico" href={borrador && tipo === 1 ? `${ruta}/${id}/editar` : `${ruta}/${id}`}>Ver</a>
        {mensaje && <button type="button" className="btn chico" onClick={() => setVerError(!verError)} aria-expanded={verError}>{verError ? 'Ocultar error' : 'Ver error del SRI'}</button>}
        {tieneClave && <form action={fC}>{ocultos}<button className="btn chico" disabled={pC}>{pC ? 'Consultando…' : 'Consultar al SRI'}</button></form>}
        {borrador && tipo === 1 && (
          <form action={borradorConFechaDeHoy}>{ocultos}
            <button className="btn chico" onClick={(e) => { if (!confirm('Se cambiará la fecha de este borrador a HOY y se abrirá para revisarlo. ¿Continuar?')) e.preventDefault(); }}>Usar fecha de hoy</button>
          </form>
        )}
        {!borrador && tipo === 1 && (
          <form action={copiarComoNueva}>{ocultos}
            <button className="btn chico" onClick={(e) => { if (!confirm('Se creará un borrador NUEVO con fecha de hoy, el mismo cliente y los mismos productos (con su IVA actual). Tendrá número nuevo al emitirse. ¿Continuar?')) e.preventDefault(); }}>Copiar como factura de hoy</button>
          </form>
        )}
        <form action={fA}>{ocultos}
          <button className="btn chico peligro" disabled={pA}
            onClick={(e) => { if (!confirm(borrador ? '¿Anular este borrador en el sistema?' : '¿Anular en el sistema? (No se anula en el SRI; nunca fue autorizado.)')) e.preventDefault(); }}>
            Anular en el sistema
          </button>
        </form>
      </div>
      {verError && mensaje && <div className="alerta error" style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{mensaje}</div>}
      <Msg r={rC} /><Msg r={rA} />
    </div>
  );
}

export function CorregirIva({ id, todos }: { id?: number; todos?: number }) {
  const [r, f, p] = useActionState<Resultado, FormData>(corregirIva, {});
  return (
    <form action={f} style={{ display: 'inline' }}>
      {id && <input type="hidden" name="id" value={id} />}
      <button className={`btn chico ${todos ? 'primario' : ''}`} disabled={p}
        onClick={(e) => { if (!confirm(todos ? `¿Cambiar a IVA 15 % los ${todos} productos con IVA antiguo?` : '¿Cambiar este producto a IVA 15 %?')) e.preventDefault(); }}>
        {p ? 'Cambiando…' : todos ? `Cambiar los ${todos} a IVA 15 %` : 'Cambiar a IVA 15 %'}
      </button>
      {r.mensaje && <span className={r.ok ? '' : 'muted'} style={{ marginLeft: 8, fontSize: '0.85rem' }}>{r.mensaje}</span>}
    </form>
  );
}
