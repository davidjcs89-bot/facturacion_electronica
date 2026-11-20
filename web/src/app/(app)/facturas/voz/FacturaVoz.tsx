'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { interpretar, recalcular, crearDesdeVoz, type Resumen } from './actions';
import type { BorradorVoz, OpcionProducto } from '@/lib/voz/interpretar';

type Op = { id: number; texto: string };
type Paso = 'inicio' | 'escuchando' | 'pensando' | 'borrador';

// Reconocimiento de voz del navegador (Chrome/Android, Safari): gratis, sin enviar audio a nuestro servidor
type Reconocedor = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};
function crearReconocedor(): Reconocedor | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = 'es-EC';
  r.continuous = true;
  r.interimResults = true;
  return r;
}

const dinero = (n: number) => `$${n.toFixed(2).replace('.', ',')}`;

function Mic({ grande = false }: { grande?: boolean }) {
  const t = grande ? 56 : 24;
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  );
}

const caja: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' };
const etiqueta: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };

export function FacturaVoz({ puntos, formas }: { puntos: (Op & { pruebas: boolean })[]; formas: Op[] }) {
  const [paso, setPaso] = useState<Paso>('inicio');
  const [punto, setPunto] = useState(puntos[0].id);
  const [texto, setTexto] = useState('');
  const [parcial, setParcial] = useState('');
  const [borrador, setBorrador] = useState<BorradorVoz | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinVoz, setSinVoz] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [pend, startTransition] = useTransition();
  const rec = useRef<Reconocedor | null>(null);
  const finalRef = useRef('');

  useEffect(() => {
    setSinVoz(!crearReconocedor());
    return () => rec.current?.abort();
  }, []);

  const esPruebas = puntos.find((p) => p.id === punto)?.pruebas;

  function enviar(dicho: string) {
    const d = dicho.trim();
    if (!d) { setPaso(borrador ? 'borrador' : 'inicio'); setError('No se escuchó nada. Intente de nuevo.'); return; }
    setPaso('pensando');
    setError(null);
    startTransition(async () => {
      const r = await interpretar(d, borrador);
      if (r.ok) { setBorrador(r.borrador); setResumen(r.resumen); setTexto(''); }
      else setError(r.mensaje);
      setPaso(r.ok || borrador ? 'borrador' : 'inicio');
    });
  }

  function escuchar() {
    const r = crearReconocedor();
    if (!r) { setSinVoz(true); setEscribiendo(true); return; }
    rec.current = r;
    finalRef.current = '';
    setParcial('');
    setError(null);
    r.onresult = (e) => {
      let fin = '', int = '';
      for (let i = 0; i < e.results.length; i++) {
        const x = e.results[i];
        if (x.isFinal) fin += x[0].transcript + ' '; else int += x[0].transcript;
      }
      finalRef.current = fin;
      setParcial((fin + int).trim());
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('El navegador no tiene permiso para usar el micrófono. Actívelo en la configuración del navegador.');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError(`El micrófono falló (${e.error}). Puede escribir el pedido.`);
    };
    r.onend = () => { rec.current = null; };
    r.start();
    setPaso('escuchando');
  }

  function terminar() {
    const r = rec.current;
    const listo = () => enviar(finalRef.current.trim() || parcial);
    if (r) { r.onend = () => { rec.current = null; listo(); }; r.stop(); } else listo();
  }

  function cancelar() {
    rec.current?.abort();
    setPaso(borrador ? 'borrador' : 'inicio');
  }

  function cambiar(b: BorradorVoz) {
    setBorrador(b);
    startTransition(async () => {
      const r = await recalcular(b);
      if (r.ok) setResumen(r.resumen); else setError(r.mensaje);
    });
  }

  function elegirProducto(i: number, o: OpcionProducto) {
    if (!borrador) return;
    const lineas = borrador.lineas.map((l, j) => (j === i ? { ...l, producto_id: o.id } : l));
    cambiar({ ...borrador, lineas, pregunta: null });
  }
  function quitarLinea(i: number) {
    if (!borrador) return;
    cambiar({ ...borrador, lineas: borrador.lineas.filter((_, j) => j !== i) });
  }
  function cantidad(i: number, n: number) {
    if (!borrador || n < 1) return;
    cambiar({ ...borrador, lineas: borrador.lineas.map((l, j) => (j === i ? { ...l, cantidad: n } : l)) });
  }

  function crear(modo: 'emitir' | 'editar') {
    if (!borrador) return;
    setError(null);
    startTransition(async () => {
      const r = await crearDesdeVoz(borrador, punto, modo);
      if (r?.mensaje) setError(r.mensaje);
    });
  }

  function reiniciar() {
    setBorrador(null); setResumen(null); setTexto(''); setParcial(''); setError(null); setPaso('inicio');
  }

  const faltaProducto = !!borrador?.lineas.some((l) => !l.producto_id);
  const clienteListo = !!borrador && (borrador.cliente.id != null || !!borrador.cliente.nuevo);
  const listo = !!borrador && borrador.lineas.length > 0 && !faltaProducto && clienteListo && !!borrador.forma_pago_id;
  const nombreCliente = (() => {
    if (!borrador) return '';
    if (borrador.cliente.id === 1) return 'CONSUMIDOR FINAL';
    if (borrador.cliente.nuevo) return borrador.cliente.nuevo.nombre;
    return borrador.cliente.opciones.find((o) => o.id === borrador.cliente.id)?.nombre ?? '';
  })();

  // ---------- Escuchando ----------
  if (paso === 'escuchando' || paso === 'pensando') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#16202e', color: '#fff', borderRadius: 16, padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {paso === 'escuchando' && <button type="button" className="btn" onClick={cancelar} style={{ background: 'transparent', color: '#c9d3e0', borderColor: '#3a4659' }}>Cancelar</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 104, height: 104, borderRadius: '50%', background: paso === 'escuchando' ? '#c0392b' : '#1f5fbf', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px rgba(255,255,255,0.08)' }}>
            <Mic grande />
          </div>
          <strong style={{ fontSize: 17 }}>{paso === 'escuchando' ? 'Escuchando…' : 'Armando el borrador…'}</strong>
        </div>
        <div style={{ flexGrow: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
          <div style={{ ...etiqueta, color: '#a9b6c7' }}>Lo que entendí</div>
          <p style={{ margin: '8px 0 0', fontSize: 19, lineHeight: 1.45 }}>{parcial || (paso === 'escuchando' ? 'Hable ahora…' : texto)}</p>
        </div>
        {paso === 'escuchando' ? (
          <button type="button" className="btn primario" onClick={terminar} style={{ minHeight: 52, fontSize: 16, background: '#fff', color: '#16202e', borderColor: '#fff' }}>
            Listo, armar borrador
          </button>
        ) : (
          <p style={{ margin: 0, textAlign: 'center', color: '#a9b6c7', fontSize: 13 }}>Nada se envía al SRI todavía.</p>
        )}
      </div>
    );
  }

  // ---------- Inicio ----------
  if (paso === 'inicio' || !borrador || !resumen) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Factura por voz</h1>
          <select aria-label="Punto de emisión" value={punto} onChange={(e) => setPunto(Number(e.target.value))} style={{ maxWidth: 260 }}>
            {puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
          </select>
        </div>
        {esPruebas && <div style={{ ...caja, background: 'var(--warn-soft)', borderColor: '#f0d9a8', fontSize: 14 }}>Punto de <strong>PRUEBAS</strong>: las facturas no tienen validez tributaria.</div>}
        {error && <div role="alert" style={{ ...caja, background: 'var(--danger-soft)', borderColor: '#f3c4bd', fontSize: 14 }}>{error}</div>}
        <p style={{ margin: 0, color: 'var(--muted)', textAlign: 'center' }}>Toque el micrófono y diga todo de una vez: cliente, productos y forma de pago.</p>
        <button type="button" onClick={escuchar} aria-label="Empezar a dictar la factura" disabled={pend}
          style={{ alignSelf: 'center', width: 140, height: 140, borderRadius: '50%', border: 0, background: 'var(--primary)', color: '#fff', cursor: 'pointer', boxShadow: '0 0 0 14px var(--primary-soft)', margin: '16px 0 4px' }}>
          <Mic grande />
        </button>
        <span style={{ textAlign: 'center', fontWeight: 600, color: 'var(--primary)' }}>{sinVoz ? 'Este navegador no reconoce voz: escriba el pedido' : 'Tocar para hablar'}</span>
        <div style={{ ...caja, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={etiqueta}>Puede decir, por ejemplo</span>
          <span>«Factura a <strong>Daniel Gómez</strong>, <strong>dos blusas</strong> y <strong>unos aretes</strong>, pago con <strong>tarjeta</strong>.»</span>
          <span>«Consumidor final, <strong>tres camisetas</strong> con <strong>10 % de descuento</strong>, efectivo.»</span>
          <span>«Cliente nuevo <strong>Ana Pérez</strong>, cédula <strong>0102…</strong>, una cartera, transferencia.»</span>
        </div>
        {(escribiendo || sinVoz) ? (
          <form onSubmit={(e) => { e.preventDefault(); setTexto(texto); enviar(texto); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="pedido" style={etiqueta}>Escriba el pedido</label>
            <textarea id="pedido" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Factura a … , productos … , pago con …" />
            <button className="btn primario" disabled={pend || !texto.trim()}>Armar borrador</button>
          </form>
        ) : (
          <button type="button" className="btn" onClick={() => setEscribiendo(true)}>Prefiero escribirlo</button>
        )}
        <Link href="/facturas/nueva" className="btn" style={{ textAlign: 'center' }}>Factura normal (sin voz)</Link>
      </div>
    );
  }

  // ---------- Borrador ----------
  const b = borrador;
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn" onClick={reiniciar}>Descartar</button>
        <strong style={{ fontSize: 17 }}>Revisar factura</strong>
        <span style={{ fontSize: 12, color: esPruebas ? 'var(--warn)' : 'var(--muted)', fontWeight: esPruebas ? 700 : 400 }}>{esPruebas ? 'PRUEBAS' : 'Borrador'}</span>
      </div>

      <p style={{ ...caja, margin: 0, fontSize: 13, color: 'var(--muted)' }}>«{b.dictados.join(' … ')}»</p>
      {error && <div role="alert" style={{ ...caja, background: 'var(--danger-soft)', borderColor: '#f3c4bd', fontSize: 14 }}>{error}</div>}

      {b.pregunta && (
        <div style={{ ...caja, background: 'var(--primary-soft)', borderColor: '#c8d9f5', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ flexGrow: 1, fontSize: 15 }}>{b.pregunta}</span>
          <button type="button" className="btn primario" onClick={escuchar} aria-label="Responder hablando" style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mic /></button>
        </div>
      )}

      {/* Cliente */}
      <section style={{ ...caja, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={etiqueta}>Cliente</span>
          {clienteListo
            ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)' }}>{b.cliente.nuevo ? '+ Se creará' : '✓ Encontrado'}</span>
            : <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warn)' }}>Falta elegir</span>}
        </div>
        {clienteListo ? (
          <>
            <strong>{nombreCliente}</strong>
            {b.cliente.nuevo && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Identificación {b.cliente.nuevo.identificacion}{b.cliente.nuevo.correo ? ` · ${b.cliente.nuevo.correo}` : ''}</span>}
            {!b.cliente.nuevo && b.cliente.id !== 1 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{b.cliente.opciones.find((o) => o.id === b.cliente.id)?.identificacion}</span>}
          </>
        ) : (
          <>
            {b.cliente.dicho && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Dijo: «{b.cliente.dicho}»</span>}
            {b.cliente.opciones.map((o) => (
              <button key={o.id} type="button" className="btn" style={{ textAlign: 'left', minHeight: 44 }}
                onClick={() => cambiar({ ...b, cliente: { ...b.cliente, id: o.id, nuevo: null } })}>
                {o.nombre} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.identificacion}</span>
              </button>
            ))}
            <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => cambiar({ ...b, cliente: { ...b.cliente, id: 1, nuevo: null } })}>Consumidor final (hasta $50)</button>
          </>
        )}
      </section>

      {/* Productos */}
      <section style={{ ...caja, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={etiqueta}>Productos</span>
        {b.lineas.length === 0 && <span style={{ color: 'var(--muted)' }}>No entendí ningún producto. Toque el micrófono y dígalos.</span>}
        {b.lineas.map((l, i) => {
          const r = resumen.lineas.find((x) => x.producto_id === l.producto_id);
          if (!l.producto_id) {
            return (
              <div key={i} style={{ background: 'var(--warn-soft)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 14 }}>«{l.dicho}» × {l.cantidad} — ¿cuál?</span>
                {l.opciones.length ? l.opciones.map((o) => (
                  <button key={o.id} type="button" className="btn" style={{ display: 'flex', justifyContent: 'space-between', minHeight: 44, textAlign: 'left' }} onClick={() => elegirProducto(i, o)}>
                    <span>{o.nombre} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.codigo}{o.stock != null ? ` · stock ${o.stock}` : ''}</span></span>
                    <strong>{dinero(o.pvp)}</strong>
                  </button>
                )) : <span style={{ fontSize: 13, color: 'var(--warn)' }}>No encontré ese producto en su catálogo.</span>}
                <button type="button" className="btn" onClick={() => quitarLinea(i)}>Quitar</button>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{r?.nombre ?? l.dicho}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r?.codigo} · {dinero(r?.precio ?? 0)} c/u{l.descuento_pct ? ` · desc. ${l.descuento_pct}%` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button type="button" className="btn" aria-label="Una menos" onClick={() => (l.cantidad > 1 ? cantidad(i, l.cantidad - 1) : quitarLinea(i))} style={{ width: 36, padding: 0 }}>−</button>
                <span style={{ minWidth: 18, textAlign: 'center' }}>{l.cantidad}</span>
                <button type="button" className="btn" aria-label="Una más" onClick={() => cantidad(i, l.cantidad + 1)} style={{ width: 36, padding: 0 }}>+</button>
                <strong style={{ minWidth: 64, textAlign: 'right' }}>{dinero(r?.total ?? 0)}</strong>
              </div>
            </div>
          );
        })}
      </section>

      {/* Pago y totales */}
      <section style={{ ...caja, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={etiqueta}>Forma de pago</span>
          <select value={b.forma_pago_id ?? ''} onChange={(e) => cambiar({ ...b, forma_pago_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— Elegir —</option>
            {formas.map((f) => <option key={f.id} value={f.id}>{f.texto}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ color: 'var(--muted)' }}>Subtotal</span><span>{dinero(resumen.subtotal)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ color: 'var(--muted)' }}>IVA</span><span>{dinero(resumen.iva)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8 }}><span>Total</span><span>{dinero(resumen.total)}</span></div>
      </section>

      <button type="button" className="btn" onClick={() => crear('editar')} disabled={pend || !b.lineas.length || faltaProducto || !clienteListo}>
        Abrir en el editor (para revisar con más detalle)
      </button>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 16px 14px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="btn" onClick={escuchar} aria-label="Corregir o agregar hablando" disabled={pend}
            style={{ width: 52, height: 52, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Mic />
          </button>
          <button type="button" className="btn primario" onClick={() => crear('emitir')} disabled={pend || !listo} style={{ flexGrow: 1, minHeight: 52, fontSize: 16 }}>
            {pend ? 'Procesando…' : listo ? `Emitir factura · ${dinero(resumen.total)}` : 'Complete lo que falta'}
          </button>
        </div>
      </div>
    </div>
  );
}
