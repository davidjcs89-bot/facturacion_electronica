'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Item = { href: string; texto: string; aviso?: number };
type Grupo = { titulo: string; items: Item[]; aviso?: { texto: string; n: number } };

/** Menú «Más» del celular: un grupo abierto a la vez; recuerda el último abierto */
export function GruposMas({ grupos }: { grupos: Grupo[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  useEffect(() => {
    try { setAbierto(localStorage.getItem('mas.grupo')); } catch { /* sin almacenamiento */ }
  }, []);
  function alternar(t: string) {
    const nuevo = abierto === t ? null : t;
    setAbierto(nuevo);
    try { if (nuevo) localStorage.setItem('mas.grupo', nuevo); else localStorage.removeItem('mas.grupo'); } catch { /* */ }
  }
  return (
    <section className="card sin-padding">
      {grupos.map((g) => {
        const on = abierto === g.titulo;
        const id = `grupo-${g.titulo.replace(/\W+/g, '-')}`;
        return (
          <div key={g.titulo} className="grupo-plegable">
            <button type="button" className="cabeza-grupo" aria-expanded={on} aria-controls={id} onClick={() => alternar(g.titulo)}>
              <span className="titulo-grupo">{g.titulo}</span>
              {g.aviso && g.aviso.n > 0
                ? <span className="contador">{g.aviso.texto} {g.aviso.n}</span>
                : <span className="muted" style={{ fontSize: 13 }}>{g.items.length}</span>}
              <span aria-hidden="true" className={`flecha-grupo ${on ? 'on' : ''}`}>›</span>
            </button>
            {on && (
              <div id={id}>
                {g.items.map((i) => (
                  <Link key={i.href} href={i.href} className="item-mas">
                    <span>{i.texto}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {i.aviso ? <span className="contador">{i.aviso}</span> : null}
                      <span aria-hidden="true" style={{ color: 'var(--muted)' }}>›</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
