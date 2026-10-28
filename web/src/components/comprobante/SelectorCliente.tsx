'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { buscarClientes, type ClienteBusqueda } from '@/app/(app)/comprobantes/busquedas';

type Sel = { id: number; nombre: string; identificacion: string } | null;

/** Selector de cliente/proveedor; guarda el id en un input oculto con el nombre indicado */
export function SelectorCliente({ nombre = 'id_cliente', inicial, tipo, permitirConsumidorFinal, etiqueta = 'Cliente' }: {
  nombre?: string; inicial: Sel; tipo?: number; permitirConsumidorFinal?: boolean; etiqueta?: string;
}) {
  const [sel, setSel] = useState<Sel>(inicial);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<ClienteBusqueda[]>([]);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    if (q.trim().length < 2) { setRes([]); return; }
    t.current = setTimeout(async () => setRes(await buscarClientes(q, tipo)), 250);
  }, [q, tipo]);
  return (
    <div className="campo ancho">
      <label>{etiqueta} *</label>
      <input type="hidden" name={nombre} value={sel?.id ?? ''} />
      {sel ? (
        <div className="acciones" style={{ justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', background: '#fafbfd' }}>
          <span><strong>{sel.nombre}</strong> · {sel.identificacion}</span>
          <button type="button" className="btn chico" onClick={() => setSel(null)}>Cambiar</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="acciones">
            <input style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por identificación o nombre (mín. 2 caracteres)" />
            {permitirConsumidorFinal && (
              <button type="button" className="btn" onClick={() => setSel({ id: 1, nombre: 'CONSUMIDOR FINAL', identificacion: '9999999999999' })}>Consumidor final</button>
            )}
            <Link className="btn" href={`/clientes/nuevo${tipo ? `?tipo=${tipo}` : ''}`} target="_blank">+ Nuevo</Link>
          </div>
          {res.length > 0 && (
            <div className="card" style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', padding: 0, maxHeight: 300, overflowY: 'auto' }}>
              {res.map((c) => (
                <button type="button" key={c.id} className="btn" style={{ display: 'block', width: '100%', border: 0, borderRadius: 0, borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'normal' }}
                  onClick={() => { setSel({ id: c.id, nombre: c.nombre_cliente, identificacion: c.identificacion }); setQ(''); setRes([]); }}>
                  <strong>{c.nombre_cliente}</strong> · {c.identificacion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
