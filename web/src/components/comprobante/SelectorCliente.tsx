'use client';
import { useEffect, useRef, useState } from 'react';
import { buscarClientes, datosCliente, type ClienteBusqueda } from '@/app/(app)/comprobantes/busquedas';
import { VentanaCliente } from './VentanaCliente';

type Sel = { id: number; nombre: string; identificacion: string } | null;

const ID_CONSUMIDOR_FINAL = 1;
const CONSUMIDOR_FINAL: Sel = { id: ID_CONSUMIDOR_FINAL, nombre: 'CONSUMIDOR FINAL', identificacion: '9999999999999' };

/** Fila "etiqueta: valor" de la ficha del cliente */
function Dato({ k, v, aviso }: { k: string; v: string | null | undefined; aviso?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: '0.9rem' }}>
      <span className="muted" style={{ minWidth: 96 }}>{k}</span>
      {v ? <span style={{ wordBreak: 'break-word' }}>{v}</span> : <span style={{ color: 'var(--danger)' }}>{aviso ?? '—'}</span>}
    </div>
  );
}

/**
 * Selector de cliente/proveedor: busca, muestra la ficha del elegido (identificación, dirección, correo, teléfono)
 * y guarda el id en un input oculto con el nombre indicado. `onCambio` avisa cuando se elige otro.
 */
export function SelectorCliente({ nombre = 'id_cliente', inicial, tipo, permitirConsumidorFinal, etiqueta = 'Cliente', onCambio }: {
  nombre?: string; inicial: Sel; tipo?: number; permitirConsumidorFinal?: boolean; etiqueta?: string; onCambio?: (id: number | null) => void;
}) {
  const [sel, setSel] = useState<Sel>(inicial);
  const [ficha, setFicha] = useState<ClienteBusqueda | null>(null);
  const [cargando, setCargando] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<ClienteBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [ventana, setVentana] = useState<null | 'nuevo' | 'editar'>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Datos completos del cliente que ya venia elegido (al editar un borrador)
  useEffect(() => {
    if (!inicial || inicial.id === ID_CONSUMIDOR_FINAL) return;
    setCargando(true);
    datosCliente(inicial.id).then((c) => setFicha(c)).finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial?.id]);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    if (q.trim().length < 2) { setRes([]); setBuscando(false); return; }
    setBuscando(true);
    t.current = setTimeout(async () => {
      setRes(await buscarClientes(q, tipo));
      setBuscando(false);
    }, 250);
  }, [q, tipo]);

  function elegir(nuevo: Sel, datos: ClienteBusqueda | null) {
    setSel(nuevo);
    setFicha(datos);
    setQ('');
    setRes([]);
    onCambio?.(nuevo?.id ?? null);
  }

  const esCF = sel?.id === ID_CONSUMIDOR_FINAL;

  // Al guardar en la ventana: si se edito el mismo cliente solo se refresca la ficha; si es nuevo, se elige
  function alGuardar(c: ClienteBusqueda) {
    const nuevo = { id: c.id, nombre: c.nombre_cliente, identificacion: c.identificacion };
    if (ventana === 'editar' && sel?.id === c.id) { setSel(nuevo); setFicha(c); }
    else elegir(nuevo, c);
    setVentana(null);
  }

  return (
    <div className="campo ancho" style={{ gridColumn: '1 / -1' }}>
      {ventana && (
        <VentanaCliente idCliente={ventana === 'editar' ? sel?.id : undefined} tipoCliente={tipo} textoInicial={ventana === 'nuevo' ? q : undefined}
          onCerrar={() => setVentana(null)} onGuardado={alGuardar} />
      )}
      <label>{etiqueta} *</label>
      <input type="hidden" name={nombre} value={sel?.id ?? ''} />
      {sel ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fafbfd' }}>
          <div className="acciones" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>{sel.nombre}</div>
              <div className="muted" style={{ fontSize: '0.88rem' }}>
                {esCF ? 'Consumidor final' : ficha?.tipo_identificacion ?? 'Identificación'} · {sel.identificacion}
              </div>
            </div>
            <div className="acciones">
              {!esCF && <button type="button" className="btn chico" onClick={() => setVentana('editar')}>Editar datos</button>}
              <button type="button" className="btn chico" onClick={() => elegir(null, null)}>Cambiar</button>
            </div>
          </div>
          {esCF ? (
            <div className="muted" style={{ fontSize: '0.88rem' }}>
              Factura sin datos del comprador. El SRI permite máximo $50 por factura a consumidor final y no se envía por correo.
            </div>
          ) : cargando ? (
            <div className="muted" style={{ fontSize: '0.88rem' }}>Cargando datos del cliente…</div>
          ) : (
            <div style={{ display: 'grid', gap: 4 }}>
              <Dato k="Dirección" v={ficha?.direccion} aviso="Sin dirección" />
              <Dato k="Correo" v={ficha?.correo} aviso="Sin correo: no recibirá la factura por correo" />
              <Dato k="Teléfono" v={ficha?.telefono} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="acciones">
            <input style={{ flex: 1, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
              placeholder="Escriba la cédula, RUC o nombre (mín. 2 letras)" />
            {permitirConsumidorFinal && (
              <button type="button" className="btn" onClick={() => elegir(CONSUMIDOR_FINAL, null)}>Consumidor final</button>
            )}
            <button type="button" className="btn" onClick={() => setVentana('nuevo')}>+ Nuevo cliente</button>
          </div>
          {q.trim().length >= 2 && (
            <div className="card" style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', marginTop: 4, padding: 0, maxHeight: 340, overflowY: 'auto' }}>
              {buscando && res.length === 0 ? (
                <div className="muted" style={{ padding: 12 }}>Buscando…</div>
              ) : res.length === 0 ? (
                <div className="muted" style={{ padding: 12 }}>
                  No se encontró «{q.trim()}». Revise lo escrito o cree el cliente con «+ Nuevo cliente».
                </div>
              ) : (
                res.map((c) => (
                  <button type="button" key={c.id} className="btn"
                    style={{ display: 'block', width: '100%', border: 0, borderRadius: 0, borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'normal', padding: '10px 12px' }}
                    onClick={() => elegir({ id: c.id, nombre: c.nombre_cliente, identificacion: c.identificacion }, c)}>
                    <div><strong>{c.nombre_cliente}</strong></div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {c.tipo_identificacion ?? 'Identificación'} {c.identificacion}
                      {c.correo ? ` · ${c.correo}` : ' · sin correo'}
                      {c.direccion ? ` · ${c.direccion}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
