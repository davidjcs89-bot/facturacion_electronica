'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { interpretar, recalcular, crearDesdeVoz, type Resumen } from './actions';
import type { BorradorVoz, OpcionProducto } from '@/lib/voz/interpretar';
import { Grabadora, grabacionSoportada } from '@/lib/voz/grabadora';

type Op = { id: number; texto: string };
type Paso = 'inicio' | 'guiado' | 'escuchando' | 'pensando' | 'borrador';
type Pregunta = { tipo: 'cliente' | 'producto' | 'pago' | 'mas'; texto: string; linea?: number };
type EstadoMic = 'desconocido' | 'pedir' | 'ok' | 'denegado';

const VACIO: BorradorVoz = { cliente: { dicho: '', id: null, nuevo: null, opciones: [] }, lineas: [], forma_pago_id: null, pregunta: null, dictados: [] };
const NEGATIVO = /^(no|nada|listo|ya|ninguno|ninguna|eso es todo|es todo|terminar|revisar|así está bien|asi esta bien)\b/i;

/** Siguiente cosa que falta preguntar; null = todo listo para revisar */
function siguiente(b: BorradorVoz | null): Pregunta {
  if (!b) return { tipo: 'cliente', texto: '¿Para quién es la factura? Diga el nombre, la cédula o «consumidor final». También puede dictar todo el pedido de una vez.' };
  const cliente = b.cliente.id != null || !!b.cliente.nuevo;
  if (!cliente) {
    if (b.cliente.opciones.length) return { tipo: 'cliente', texto: 'Encontré varios clientes parecidos. ¿Cuál es?' };
    if (b.cliente.dicho) return { tipo: 'cliente', texto: `No encontré a «${b.cliente.dicho}». Si es un cliente nuevo, dígame su cédula o RUC.` };
    return { tipo: 'cliente', texto: '¿Para quién es la factura? Diga el nombre, la cédula o «consumidor final».' };
  }
  if (!b.lineas.length) return { tipo: 'producto', texto: '¿Qué productos lleva? Diga la cantidad y el producto, por ejemplo «dos blusas».' };
  const i = b.lineas.findIndex((l) => !l.producto_id);
  if (i >= 0) {
    const l = b.lineas[i];
    return l.opciones.length
      ? { tipo: 'producto', linea: i, texto: `¿Cuál «${l.dicho}»? Toque una opción o dígala.` }
      : { tipo: 'producto', linea: i, texto: `No encontré «${l.dicho}» en sus productos. Diga otro nombre o «quitar».` };
  }
  if (!b.forma_pago_id) return { tipo: 'pago', texto: '¿Cómo paga? Efectivo, tarjeta o transferencia.' };
  return { tipo: 'mas', texto: '¿Algo más? Diga otro producto, o «no» para revisar la factura.' };
}

/** Nombre corto de las formas de pago del SRI para los botones */
function pagoCorto(t: string): string | null {
  const x = t.toUpperCase();
  if (x.includes('SIN UTILIZACION')) return 'Efectivo';
  if (x.includes('DEBITO')) return 'Tarjeta de débito';
  if (x.includes('CREDITO')) return 'Tarjeta de crédito';
  if (x.includes('OTROS CON UTILIZACION')) return 'Transferencia';
  return null;
}

const esIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);


// Reconocimiento de voz del navegador (Chrome/Android, Safari): gratis, sin enviar audio a nuestro servidor
type Reconocedor = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};
function crearReconocedor(continuo = true): Reconocedor | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = 'es-EC';
  r.continuous = continuo;
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

function AyudaMic({ reintentar }: { reintentar: () => void }) {
  const ios = esIOS();
  return (
    <div role="alert" style={{ background: 'var(--danger-soft)', border: '1px solid #f3c4bd', borderRadius: 12, padding: '12px 14px', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <strong>El micrófono está bloqueado para esta página.</strong>
      {ios ? (
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>En Safari toque el ícono <strong>«aA»</strong> o el de la izquierda de la dirección.</li>
          <li>Toque <strong>Configuración del sitio web › Micrófono › Permitir</strong>.</li>
          <li>Si no aparece: <strong>Ajustes del iPhone › Apps › Safari › Micrófono › Permitir</strong>, y en <strong>Ajustes › General › Teclado</strong> active <strong>«Activar dictado»</strong>.</li>
        </ol>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>Toque el <strong>candado</strong> (o el ícono de ajustes) junto a la dirección.</li>
          <li>Entre en <strong>Permisos › Micrófono › Permitir</strong>.</li>
        </ol>
      )}
      <button type="button" className="btn" onClick={reintentar} style={{ alignSelf: 'flex-start' }}>Ya lo activé, intentar de nuevo</button>
    </div>
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

  // ---- modo guiado (la app pregunta cada parte) ----
  const [preg, setPreg] = useState<Pregunta | null>(null);
  const [oyendo, setOyendo] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [tocar, setTocar] = useState(false); // el navegador no dejó escuchar solo: tocar el micrófono
  const [conVoz, setConVoz] = useState(true);
  const [mic, setMic] = useState<EstadoMic>('desconocido');
  const [chat, setChat] = useState<{ de: 'app' | 'yo'; texto: string }[]>([]);
  const [respuesta, setRespuesta] = useState('');
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [nivel, setNivel] = useState(0);
  const pregRef = useRef<Pregunta | null>(null);
  const borradorRef = useRef<BorradorVoz | null>(null);
  const grab = useRef<Grabadora | null>(null);
  const conVozRef = useRef(true);
  const vivo = useRef(true);

  useEffect(() => { borradorRef.current = borrador; }, [borrador]);
  useEffect(() => {
    vivo.current = true;
    setSinVoz(!grabacionSoportada());
    try { const g = localStorage.getItem('voz.punto'); if (g && puntos.some((p) => p.id === Number(g))) setPunto(Number(g)); } catch { /* sin almacenamiento */ }
    try { if (localStorage.getItem('voz.sonido') === 'no') { setConVoz(false); conVozRef.current = false; } } catch { /* */ }
    const perm = (navigator as Navigator & { permissions?: { query(d: { name: string }): Promise<{ state: string }> } }).permissions;
    perm?.query({ name: 'microphone' })
      .then((r) => setMic(r.state === 'granted' ? 'ok' : r.state === 'denied' ? 'denegado' : 'pedir'))
      .catch(() => setMic('pedir'));
    return () => { vivo.current = false; grab.current?.cancelar(); try { window.speechSynthesis?.cancel(); } catch { /* */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function elegirPunto(id: number) {
    setPunto(id);
    try { localStorage.setItem('voz.punto', String(id)); } catch { /* */ }
  }
  function alternarVoz() {
    const v = !conVoz;
    setConVoz(v);
    conVozRef.current = v;
    try { localStorage.setItem('voz.sonido', v ? 'si' : 'no'); } catch { /* */ }
    if (!v) try { window.speechSynthesis?.cancel(); } catch { /* */ }
  }

  function callar() {
    grab.current?.cancelar();
    grab.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
    setOyendo(false);
    setNivel(0);
  }

  function hablar(texto: string, luego: () => void) {
    const ss = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!conVozRef.current || !ss) { luego(); return; }
    let hecho = false;
    const fin = () => { if (hecho) return; hecho = true; setTimeout(() => { if (vivo.current) luego(); }, 250); };
    try {
      if (ss.speaking || ss.pending) ss.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES';
      const voces = ss.getVoices();
      const v = voces.find((x) => /^es[-_](EC|CO|MX|US|419)/i.test(x.lang)) ?? voces.find((x) => x.lang.toLowerCase().startsWith('es'));
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = 1.05;
      u.onend = fin; u.onerror = fin;
      ss.speak(u);
      setTimeout(fin, Math.max(3000, texto.length * 90)); // por si el navegador no avisa que terminó
    } catch { fin(); }
  }

  async function transcribir(audio: Blob): Promise<string | null> {
    const f = new FormData();
    f.append('audio', audio, 'respuesta');
    try {
      const r = await fetch('/api/voz/transcribir', { method: 'POST', body: f });
      const j = (await r.json().catch(() => ({}))) as { texto?: string; error?: string };
      if (!r.ok) { setError(j.error ?? 'No se pudo pasar la voz a texto.'); return null; }
      return j.texto ?? '';
    } catch {
      setError('Sin conexión. Revise el internet e intente de nuevo.');
      return null;
    }
  }

  /** Graba la respuesta; se detiene sola al callarse. Desde un toque en iPhone. */
  function grabarRespuesta() {
    if (!grabacionSoportada()) { setSinVoz(true); setEscribiendo(true); setTocar(false); return; }
    callar();
    setError(null);
    setParcial('');
    const g = new Grabadora({
      onNivel: (n) => setNivel(n),
      onNada: () => { if (grab.current === g) grab.current = null; setOyendo(false); setNivel(0); setTocar(true); setParcial('No le escuché. Toque «Responder» y hable.'); },
      onError: (m, denegado) => { if (grab.current === g) grab.current = null; setOyendo(false); setTocar(true); if (denegado) setMic('denegado'); else setError(m); },
      onFin: async (audio) => {
        if (grab.current === g) grab.current = null;
        setOyendo(false); setNivel(0); setTranscribiendo(true);
        const texto = await transcribir(audio);
        setTranscribiendo(false);
        if (!vivo.current) return;
        if (texto) { setMic('ok'); responder(texto); }
        else { setTocar(true); if (texto === '') setParcial('No le entendí. Toque «Responder» y repita, por favor.'); }
      },
    });
    grab.current = g;
    setOyendo(true);
    setTocar(false);
    void g.iniciar().then((ok) => { if (ok) setMic('ok'); });
  }

  function preguntar(b: BorradorVoz | null, q: Pregunta = siguiente(b)) {
    pregRef.current = q;
    setPreg(q);
    setParcial('');
    setChat((c) => [...c, { de: 'app', texto: q.texto }]);
    // En iPhone el micrófono solo se abre con un toque: leemos la pregunta y esperamos «Responder»
    hablar(q.texto, esIOS() ? () => setTocar(true) : grabarRespuesta);
  }

  function irAlBorrador(b: BorradorVoz) {
    callar();
    setBorrador(b);
    startTransition(async () => {
      const r = await recalcular(b);
      if (r.ok) setResumen(r.resumen); else setError(r.mensaje);
      setPaso('borrador');
    });
  }

  function responder(d: string) {
    const q = pregRef.current;
    const b = borradorRef.current;
    setChat((c) => [...c, { de: 'yo', texto: d }]);
    setRespuesta('');
    if (q?.tipo === 'mas' && b && NEGATIVO.test(d.trim())) { irAlBorrador(b); return; }
    setPensando(true);
    setError(null);
    startTransition(async () => {
      const r = await interpretar(d, { ...(b ?? VACIO), pregunta: q?.texto ?? null });
      setPensando(false);
      if (!vivo.current) return;
      if (r.ok) { setBorrador(r.borrador); borradorRef.current = r.borrador; setResumen(r.resumen); preguntar(r.borrador); }
      else { setError(r.mensaje); setTocar(true); }
    });
  }

  /** Respuesta tocando un botón (cliente, producto o forma de pago) */
  function elegirGuiado(b: BorradorVoz, texto: string) {
    callar();
    setChat((c) => [...c, { de: 'yo', texto }]);
    setBorrador(b);
    borradorRef.current = b;
    startTransition(async () => {
      const r = await recalcular(b);
      if (r.ok) setResumen(r.resumen);
    });
    preguntar(b);
  }

  function tocarMic() {
    if (oyendo) { grab.current?.terminar(); return; }
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
    grabarRespuesta();
  }

  function empezar() {
    // desbloquea la voz del teléfono dentro del toque (iPhone lo exige)
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis?.speak(u); } catch { /* */ }
    if (!grabacionSoportada()) { setSinVoz(true); setEscribiendo(true); return; }
    setError(null);
    setChat([]);
    setPaso('guiado');
    preguntar(borrador);
  }

  /** Desde la factura: corregir o agregar hablando */
  function corregirHablando() {
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis?.speak(u); } catch { /* */ }
    setError(null);
    setPaso('guiado');
    preguntar(borrador, { tipo: 'mas', texto: '¿Qué desea corregir o agregar? Diga «no» para volver a la factura.' });
  }

  function salirGuiado() {
    callar();
    if (borrador) irAlBorrador(borrador); else setPaso('inicio');
  }

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

  // ---------- Guiado: la app pregunta cada parte ----------
  if (paso === 'guiado') {
    const b = borrador;
    const listoCli = !!b && (b.cliente.id != null || !!b.cliente.nuevo);
    const listoProd = !!b && b.lineas.length > 0 && b.lineas.every((l) => l.producto_id);
    const listoPago = !!b?.forma_pago_id;
    const linea = preg?.linea != null && b ? b.lineas[preg.linea] : null;
    const pill = (ok: boolean, txt: string, actual: boolean) => (
      <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '6px 4px', borderRadius: 999,
        background: ok ? 'var(--ok-soft, #e3f4ea)' : actual ? 'var(--primary-soft)' : 'var(--surface)',
        color: ok ? 'var(--ok)' : actual ? 'var(--primary)' : 'var(--muted)', border: '1px solid var(--border)' }}>{ok ? '✓ ' : ''}{txt}</span>
    );
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 110 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button type="button" className="btn" onClick={salirGuiado}>{b ? 'Ver factura' : 'Salir'}</button>
          <strong style={{ fontSize: 16 }}>Factura por voz{esPruebas ? ' · PRUEBAS' : ''}</strong>
          <button type="button" className="btn" onClick={alternarVoz} aria-label={conVoz ? 'Silenciar las preguntas' : 'Leer las preguntas en voz alta'} style={{ width: 44, padding: 0 }}>{conVoz ? '🔊' : '🔇'}</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {pill(listoCli, 'Cliente', preg?.tipo === 'cliente')}
          {pill(listoProd, 'Productos', preg?.tipo === 'producto')}
          {pill(listoPago, 'Pago', preg?.tipo === 'pago')}
        </div>

        {chat.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {chat.slice(0, -1).slice(-6).map((m, i) => (
              <span key={i} style={{ alignSelf: m.de === 'yo' ? 'flex-end' : 'flex-start', maxWidth: '85%', fontSize: 13, padding: '6px 10px', borderRadius: 10,
                background: m.de === 'yo' ? 'var(--primary)' : 'var(--surface)', color: m.de === 'yo' ? '#fff' : 'var(--muted)', border: m.de === 'yo' ? 0 : '1px solid var(--border)' }}>{m.texto}</span>
            ))}
          </div>
        )}

        {mic === 'denegado' && <AyudaMic reintentar={() => { setMic('pedir'); grabarRespuesta(); }} />}
        {error && <div role="alert" style={{ ...caja, background: 'var(--danger-soft)', borderColor: '#f3c4bd', fontSize: 14 }}>{error}</div>}

        <div style={{ ...caja, background: 'var(--primary-soft)', borderColor: '#c8d9f5' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <p style={{ margin: 0, fontSize: 19, lineHeight: 1.4, fontWeight: 600, flexGrow: 1 }}>{pensando ? 'Un momento…' : preg?.texto}</p>
            {!pensando && preg && (
              <button type="button" className="btn" aria-label="Escuchar la pregunta otra vez" style={{ flexShrink: 0, width: 44, height: 44, padding: 0 }}
                onClick={() => { if (!conVozRef.current) { conVozRef.current = true; setConVoz(true); try { localStorage.setItem('voz.sonido', 'si'); } catch { /* */ } } hablar(preg.texto, () => setTocar(true)); }}>🔁</button>
            )}
          </div>
        </div>

        {/* opciones para tocar */}
        {!pensando && preg?.tipo === 'cliente' && b && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {b.cliente.opciones.map((o) => (
              <button key={o.id} type="button" className="btn" style={{ textAlign: 'left', minHeight: 44 }}
                onClick={() => elegirGuiado({ ...b, cliente: { ...b.cliente, id: o.id, nuevo: null } }, o.nombre)}>
                {o.nombre} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.identificacion}</span>
              </button>
            ))}
          </div>
        )}
        {!pensando && preg?.tipo === 'cliente' && (
          <button type="button" className="btn" style={{ minHeight: 44 }}
            onClick={() => elegirGuiado({ ...(b ?? VACIO), cliente: { dicho: 'consumidor final', id: 1, nuevo: null, opciones: [] } }, 'Consumidor final')}>Consumidor final (hasta $50)</button>
        )}
        {!pensando && preg?.tipo === 'producto' && b && linea && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {linea.opciones.map((o) => (
              <button key={o.id} type="button" className="btn" style={{ display: 'flex', justifyContent: 'space-between', minHeight: 44, textAlign: 'left' }}
                onClick={() => elegirGuiado({ ...b, lineas: b.lineas.map((l, j) => (j === preg.linea ? { ...l, producto_id: o.id } : l)) }, o.nombre)}>
                <span>{o.nombre} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.codigo}{o.stock != null ? ` · stock ${o.stock}` : ''}</span></span>
                <strong>{dinero(o.pvp)}</strong>
              </button>
            ))}
            <button type="button" className="btn" onClick={() => elegirGuiado({ ...b, lineas: b.lineas.filter((_, j) => j !== preg.linea) }, `Quitar «${linea.dicho}»`)}>Quitar «{linea.dicho}»</button>
          </div>
        )}
        {!pensando && preg?.tipo === 'pago' && b && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {formas.filter((f) => pagoCorto(f.texto)).map((f) => (
              <button key={f.id} type="button" className="btn" style={{ minHeight: 48 }} onClick={() => elegirGuiado({ ...b, forma_pago_id: f.id }, pagoCorto(f.texto)!)}>{pagoCorto(f.texto)}</button>
            ))}
          </div>
        )}
        {!pensando && preg?.tipo === 'mas' && b && (
          <button type="button" className="btn primario" style={{ minHeight: 48 }} onClick={() => { setChat((c) => [...c, { de: 'yo', texto: 'No, revisar' }]); irAlBorrador(b); }}>No, revisar la factura</button>
        )}

        {(oyendo || (parcial && !pensando && !transcribiendo)) && (
          <div style={{ ...caja }}>
            <span style={etiqueta}>{oyendo ? 'Grabando…' : 'Aviso'}</span>
            <p style={{ margin: '6px 0 0', fontSize: 17 }}>{oyendo ? 'Hable ahora. Me detengo solo cuando termine.' : parcial}</p>
          </div>
        )}

        {escribiendo && (
          <form onSubmit={(e) => { e.preventDefault(); if (respuesta.trim()) { callar(); responder(respuesta.trim()); } }} style={{ display: 'flex', gap: 8 }}>
            <textarea id="respuesta-voz" aria-label="Respuesta" rows={2} value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Escriba la respuesta" style={{ flexGrow: 1, fontSize: 16 }} />
            <button className="btn primario" disabled={pend || !respuesta.trim()}>Enviar</button>
          </form>
        )}

        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 16px 14px' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" className="btn" onClick={() => setEscribiendo((x) => !x)} style={{ minHeight: 52 }}>{escribiendo ? 'Ocultar' : 'Escribir'}</button>
            <button type="button" onClick={tocarMic} disabled={pensando || transcribiendo} aria-label={oyendo ? 'Terminar de hablar' : 'Responder hablando'}
              style={{ flexGrow: 1, minHeight: 56, borderRadius: 28, border: 0, color: '#fff', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: oyendo ? '#c0392b' : 'var(--primary)', opacity: pensando || transcribiendo ? 0.6 : 1, boxShadow: oyendo ? `0 0 0 ${4 + Math.round(nivel * 14)}px rgba(192,57,43,0.25)` : 'none', transition: 'box-shadow 0.1s' }}>
              <Mic /> {transcribiendo ? 'Escuchando lo grabado…' : pensando ? 'Pensando…' : oyendo ? 'Listo, terminé' : 'Responder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <select aria-label="Punto de emisión" value={punto} onChange={(e) => elegirPunto(Number(e.target.value))} style={{ maxWidth: 260 }}>
            {puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
          </select>
        </div>
        {esPruebas && <div style={{ ...caja, background: 'var(--warn-soft)', borderColor: '#f0d9a8', fontSize: 14 }}>Punto de <strong>PRUEBAS</strong>: las facturas no tienen validez tributaria.</div>}
        {error && <div role="alert" style={{ ...caja, background: 'var(--danger-soft)', borderColor: '#f3c4bd', fontSize: 14 }}>{error}</div>}
        {mic === 'denegado' && <AyudaMic reintentar={() => { void empezar(); }} />}
        <p style={{ margin: 0, color: 'var(--muted)', textAlign: 'center' }}>Toque el micrófono: le iré preguntando el cliente, los productos y la forma de pago. Si prefiere, diga todo de una vez.</p>
        {mic === 'pedir' && <p style={{ margin: 0, textAlign: 'center', fontSize: 13 }}>La primera vez el teléfono le pedirá permiso para el micrófono: toque <strong>«Permitir»</strong>.</p>}
        <button type="button" onClick={() => { void empezar(); }} aria-label="Empezar a dictar la factura" disabled={pend}
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
          <button type="button" className="btn primario" onClick={corregirHablando} aria-label="Responder hablando" style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mic /></button>
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
          <button type="button" className="btn" onClick={corregirHablando} aria-label="Corregir o agregar hablando" disabled={pend}
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
