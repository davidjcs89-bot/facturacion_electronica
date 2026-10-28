'use client';
import { useActionState, useState } from 'react';
import { accionEmitir, accionConsultar, accionReenviar, accionAnular, type EstadoAccion } from '@/app/(app)/comprobantes/actions';
import { ESTADO } from '@/lib/constantes';

type Props = {
  tipo: number; id: number; estado: number; tieneClave: boolean; correo?: string | null;
  emisionPermitida: boolean; motivoBloqueo?: string; puedeEmitir: boolean; tieneXmlAutorizado: boolean;
};

function Mensaje({ e }: { e: EstadoAccion }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`} style={{ whiteSpace: 'pre-wrap' }}>{e.mensaje}</div>;
}

export function AccionesSri(p: Props) {
  const [eEmitir, fEmitir, pEmitir] = useActionState<EstadoAccion, FormData>(accionEmitir, {});
  const [eConsultar, fConsultar, pConsultar] = useActionState<EstadoAccion, FormData>(accionConsultar, {});
  const [eCorreo, fCorreo, pCorreo] = useActionState<EstadoAccion, FormData>(accionReenviar, {});
  const [eAnular, fAnular, pAnular] = useActionState<EstadoAccion, FormData>(accionAnular, {});
  const [verCorreo, setVerCorreo] = useState(false);
  const base = `/api/comprobantes/${p.tipo}/${p.id}`;
  const autorizado = p.estado === ESTADO.AUTORIZADO;
  const anulado = p.estado === ESTADO.ANULADO;
  const enProceso = p.estado === ESTADO.RECIBIDO || (p.tieneClave && !autorizado && !anulado && p.estado !== ESTADO.NO_AUTORIZADO);
  const ocultos = (
    <>
      <input type="hidden" name="tipo" value={p.tipo} />
      <input type="hidden" name="id" value={p.id} />
    </>
  );
  return (
    <div className="card">
      <h2>Comprobante electrónico</h2>
      <Mensaje e={eEmitir} />
      <Mensaje e={eConsultar} />
      <Mensaje e={eCorreo} />
      <Mensaje e={eAnular} />
      {!p.emisionPermitida && !autorizado && p.puedeEmitir && <div className="alerta aviso">{p.motivoBloqueo}</div>}
      <div className="acciones">
        <a className="btn" href={`${base}/ride.pdf`} target="_blank" rel="noreferrer">Ver RIDE (PDF)</a>
        {p.tieneXmlAutorizado && <a className="btn" href={`${base}/autorizado.xml`}>Descargar XML</a>}
        {!autorizado && !anulado && p.puedeEmitir && (
          <form action={fEmitir}>
            {ocultos}
            <button className="btn primario" disabled={pEmitir || !p.emisionPermitida}
              onClick={(ev) => { if (!confirm('¿Enviar este comprobante al SRI? Esta acción no se puede deshacer.')) ev.preventDefault(); }}>
              {pEmitir ? 'Enviando al SRI…' : p.estado === ESTADO.NO_RECIBIDO || p.estado === ESTADO.NO_AUTORIZADO ? 'Reenviar al SRI' : 'Firmar y enviar al SRI'}
            </button>
          </form>
        )}
        {enProceso && (
          <form action={fConsultar}>
            {ocultos}
            <button className="btn" disabled={pConsultar}>{pConsultar ? 'Consultando…' : 'Consultar autorización'}</button>
          </form>
        )}
        {autorizado && (
          <button className="btn" onClick={() => setVerCorreo(!verCorreo)}>Reenviar por correo</button>
        )}
        {!anulado && (
          <form action={fAnular}>
            {ocultos}
            <button className="btn peligro" disabled={pAnular}
              onClick={(ev) => { if (!confirm('¿Anular este comprobante en el sistema?')) ev.preventDefault(); }}>
              Anular
            </button>
          </form>
        )}
      </div>
      {verCorreo && (
        <form action={fCorreo} className="filtros" style={{ marginTop: 12 }}>
          {ocultos}
          <div className="campo busqueda"><label>Correo(s) de destino</label><input name="correo" defaultValue={p.correo?.toLowerCase() ?? ''} /></div>
          <button className="btn primario" disabled={pCorreo}>{pCorreo ? 'Enviando…' : 'Enviar'}</button>
        </form>
      )}
    </div>
  );
}
