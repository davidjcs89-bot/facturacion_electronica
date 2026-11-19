'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Config = { formato: 'a4' | 'ticket80' | 'ticket58'; alEmitir: 'preguntar' | 'siempre' | 'nunca' };
/** tipo: 1..6 (tipo_documento) o «proforma» / «pedido» */
type Tipo = number | 'proforma' | 'pedido';

const NOMBRES: Record<string, string> = {
  '1': 'la factura', '2': 'la liquidación de compra', '3': 'la nota de crédito', '4': 'la nota de débito',
  '5': 'la guía de remisión', '6': 'la retención', proforma: 'la proforma', pedido: 'el pedido',
};

async function leerConfig(): Promise<Config> {
  try {
    const r = await fetch('/api/imprimir/config', { cache: 'no-store' });
    if (r.ok) return (await r.json()) as Config;
  } catch { /* sin conexion: valores por defecto */ }
  return { formato: 'ticket80', alEmitir: 'preguntar' };
}

/**
 * Imprime el comprobante. Ticket: se carga en un marco oculto y se abre el dialogo de impresion
 * (la impresora termica debe estar como predeterminada, igual que en el sistema anterior).
 * A4: abre el RIDE en PDF en otra pestaña para imprimirlo. Devuelve false si el navegador bloqueo la ventana.
 */
function imprimir(tipo: Tipo, id: number, formato: Config['formato']): boolean {
  const url = `/api/imprimir/${tipo}/${id}`;
  if (formato === 'a4') return !!window.open(url, '_blank');
  document.getElementById('marco-impresion')?.remove();
  const f = document.createElement('iframe');
  f.id = 'marco-impresion';
  f.title = 'Impresión';
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.onload = () => {
    try {
      f.contentWindow?.focus();
      f.contentWindow?.print();
    } catch {
      window.open(`${url}?auto=1`, '_blank');
    }
  };
  f.src = url;
  document.body.appendChild(f);
  return true;
}

/** Botón «Imprimir» (reimpresión en cualquier momento) */
export function BotonImprimir({ tipo, id, texto = 'Imprimir' }: { tipo: Tipo; id: number; texto?: string }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button type="button" className="btn" disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        const c = await leerConfig();
        imprimir(tipo, id, c.formato);
        setTimeout(() => setOcupado(false), 1500);
      }}>
      {ocupado ? 'Preparando…' : texto}
    </button>
  );
}

/**
 * Al terminar de emitir (la página llega con ?imprimir=1, o `activar` pasa a true):
 * según Configuración › Impresión pregunta «¿Desea imprimir…?», imprime sin preguntar o no hace nada.
 */
export function PreguntarImprimir({ tipo, id, activar = false }: { tipo: Tipo; id: number; activar?: boolean }) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [abierto, setAbierto] = useState(false);
  const hecho = useRef(false);

  const iniciar = useCallback(async () => {
    if (hecho.current) return;
    hecho.current = true;
    const c = await leerConfig();
    setCfg(c);
    if (c.alEmitir === 'nunca') return;
    if (c.alEmitir === 'siempre' && imprimir(tipo, id, c.formato)) return;
    setAbierto(true); // preguntar, o el navegador bloqueo la ventana del PDF
  }, [tipo, id]);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get('imprimir') === '1') {
      u.searchParams.delete('imprimir');
      window.history.replaceState(null, '', u.pathname + u.search + u.hash);
      void iniciar();
    }
  }, [iniciar]);

  useEffect(() => {
    if (activar) void iniciar();
  }, [activar, iniciar]);

  if (!abierto || !cfg) return null;
  const cerrar = () => setAbierto(false);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-imprimir"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}>
      <div className="card" style={{ maxWidth: 380, width: 'calc(100% - 32px)', margin: 0 }}>
        <h2 id="titulo-imprimir" style={{ marginTop: 0 }}>¿Desea imprimir {NOMBRES[String(tipo)] ?? 'el comprobante'}?</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {cfg.formato === 'a4' ? 'Se abrirá el RIDE en PDF (hoja A4).' : `Se imprimirá en ticket de ${cfg.formato === 'ticket58' ? '58' : '80'} mm.`}
        </p>
        <div className="acciones" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={cerrar}>No</button>
          <button type="button" className="btn primario" autoFocus onClick={() => { imprimir(tipo, id, cfg.formato); cerrar(); }}>Sí, imprimir</button>
        </div>
      </div>
    </div>
  );
}
