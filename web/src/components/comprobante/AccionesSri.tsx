'use client';
import { useActionState, useState } from 'react';
import { accionEmitir, accionConsultar, accionReenviar, accionAnular, type EstadoAccion } from '@/app/(app)/comprobantes/actions';
import { ESTADO } from '@/lib/constantes';
import { BotonImprimir, PreguntarImprimir } from './Imprimir';

type Props = {
  tipo: number; id: number; estado: number; tieneClave: boolean; correo?: string | null;
  emisionPermitida: boolean; motivoBloqueo?: string; puedeEmitir: boolean; tieneXmlAutorizado: boolean;
  /** para el nombre del PDF al compartir, p. ej. «Factura 001-001-000000141» */
  nombre?: string;
  /** enlaces extra para el menú «Más» del celular (p. ej. Nota de crédito) */
  extras?: { href: string; texto: string }[];
};

const NOMBRE_TIPO: Record<number, string> = { 1: 'Factura', 2: 'Liquidación', 3: 'Nota de crédito', 4: 'Nota de débito', 5: 'Guía de remisión', 6: 'Retención' };

/** Comparte el PDF (RIDE) con el menú del teléfono: WhatsApp, correo, etc. Si no se puede, lo abre. */
async function compartirPdf(url: string, nombre: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return 'No se pudo generar el PDF.';
    const blob = await r.blob();
    const archivo = new File([blob], `${nombre.replace(/[\\/:*?"<>|]/g, '-')}.pdf`, { type: 'application/pdf' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [archivo] })) {
      await nav.share({ files: [archivo], title: nombre });
      return null;
    }
    window.open(url, '_blank');
    return null;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return null; // la persona cerró el menú
    window.open(url, '_blank');
    return null;
  }
}

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
  const [hoja, setHoja] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const nombre = p.nombre || `${NOMBRE_TIPO[p.tipo] ?? 'Comprobante'} ${p.id}`;
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
    <div className="card acciones-sri">
      <h2>Comprobante electrónico</h2>
      <Mensaje e={eEmitir} />
      <Mensaje e={eConsultar} />
      <Mensaje e={eCorreo} />
      <Mensaje e={eAnular} />
      {!p.emisionPermitida && !autorizado && p.puedeEmitir && <div className="alerta aviso">{p.motivoBloqueo}</div>}
      <div className="acciones">
        {p.tieneClave && !anulado && <BotonImprimir tipo={p.tipo} id={p.id} />}
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
      <PreguntarImprimir tipo={p.tipo} id={p.id} activar={!!eEmitir.ok && !anulado} />

      {/* Celular: acciones fijas abajo; lo que se usa poco va en «Más» */}
      <div className="barra-acciones-movil">
        {!autorizado && !anulado && p.puedeEmitir ? (
          <form action={fEmitir} style={{ gridColumn: 'span 2', display: 'flex' }}>
            {ocultos}
            <button className="btn primario grande" style={{ flexGrow: 1 }} disabled={pEmitir || !p.emisionPermitida}
              onClick={(ev) => { if (!confirm('¿Enviar este comprobante al SRI? Esta acción no se puede deshacer.')) ev.preventDefault(); }}>
              {pEmitir ? 'Enviando…' : p.estado === ESTADO.NO_RECIBIDO || p.estado === ESTADO.NO_AUTORIZADO ? 'Reenviar al SRI' : 'Enviar al SRI'}
            </button>
          </form>
        ) : (
          <>
            {p.tieneClave && !anulado ? <BotonImprimir tipo={p.tipo} id={p.id} /> : <a className="btn" href={`${base}/ride.pdf`} target="_blank" rel="noreferrer">PDF</a>}
            <button type="button" className="btn primario" disabled={compartiendo}
              onClick={async () => { setCompartiendo(true); await compartirPdf(`${base}/ride.pdf`, nombre); setCompartiendo(false); }}>
              {compartiendo ? 'Preparando…' : 'Compartir'}
            </button>
          </>
        )}
        <button type="button" className="btn" onClick={() => setHoja(true)} aria-haspopup="dialog">Más</button>
      </div>
      {hoja && (
        <div className="hoja-fondo" onClick={() => setHoja(false)}>
          <section className="hoja" role="dialog" aria-label="Más acciones" onClick={(e) => e.stopPropagation()}>
            <span className="asa" />
            <strong style={{ fontSize: 18, marginBottom: 6 }}>Más acciones</strong>
            <a className="opcion-lista" href={`${base}/ride.pdf`} target="_blank" rel="noreferrer">Ver PDF (RIDE)</a>
            {p.tieneXmlAutorizado && <a className="opcion-lista" href={`${base}/autorizado.xml`}>Descargar XML</a>}
            {autorizado && <button type="button" className="opcion-lista" onClick={() => { setHoja(false); setVerCorreo(true); }}>Reenviar por correo</button>}
            {enProceso && (
              <form action={(fd) => { setHoja(false); fConsultar(fd); }}>{ocultos}<button className="opcion-lista">Consultar autorización</button></form>
            )}
            {(p.extras ?? []).map((x) => <a key={x.href} className="opcion-lista" href={x.href}>{x.texto}</a>)}
            {!anulado && (
              <form action={(fd) => { setHoja(false); fAnular(fd); }}>{ocultos}
                <button className="opcion-lista peligro" onClick={(ev) => { if (!confirm('¿Anular este comprobante en el sistema?')) ev.preventDefault(); }}>Anular</button>
              </form>
            )}
            <button type="button" className="btn" style={{ minHeight: 44, marginTop: 8 }} onClick={() => setHoja(false)}>Cancelar</button>
          </section>
        </div>
      )}
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
