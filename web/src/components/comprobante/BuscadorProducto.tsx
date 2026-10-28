'use client';
import { useEffect, useRef, useState } from 'react';
import { buscarProductos, type ProductoBusqueda } from '@/app/(app)/comprobantes/busquedas';
import { money } from '@/lib/formato';

/** Campo de busqueda de productos con lista de resultados */
export function BuscadorProducto({ onElegir, placeholder }: { onElegir: (p: ProductoBusqueda) => void; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<ProductoBusqueda[]>([]);
  const [abierto, setAbierto] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (!q.trim()) { setRes([]); return; }
    temporizador.current = setTimeout(async () => {
      setRes(await buscarProductos(q));
      setAbierto(true);
    }, 250);
  }, [q]);
  return (
    <div style={{ position: 'relative' }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? 'Buscar producto por código o nombre'}
        onFocus={() => res.length && setAbierto(true)} onBlur={() => setTimeout(() => setAbierto(false), 200)} />
      {abierto && res.length > 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', padding: 0, maxHeight: 320, overflowY: 'auto' }}>
          {res.map((p) => (
            <button type="button" key={p.id} className="btn" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', border: 0, borderRadius: 0, borderBottom: '1px solid var(--border)', whiteSpace: 'normal', textAlign: 'left' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onElegir(p); setQ(''); setRes([]); setAbierto(false); }}>
              <span><strong>{p.codigo}</strong> · {p.nombre}{p.stock != null && <span className="muted"> · stock {p.stock}</span>}</span>
              <span className="muted">PVP {money(p.pvp)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
