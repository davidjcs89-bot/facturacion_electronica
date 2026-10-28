import Link from 'next/link';
import { NOMBRE_ESTADO } from '@/lib/constantes';

export function Cabecera({ titulo, sub, children }: { titulo: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="cabecera">
      <div>
        <h1>{titulo}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children && <div className="acciones">{children}</div>}
    </div>
  );
}

export function Estado({ id }: { id: number | null | undefined }) {
  if (id == null) return null;
  return <span className={`badge e${id}`}>{NOMBRE_ESTADO[id] ?? `Estado ${id}`}</span>;
}

export function Alerta({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'ok' | 'aviso'; children: React.ReactNode }) {
  return <div className={`alerta ${tipo}`}>{children}</div>;
}

/** Paginacion basada en parametros de la URL (?p=) conservando los demas filtros */
export function Paginacion({ pagina, total, porPagina, params }: {
  pagina: number; total: number; porPagina: number; params: Record<string, string | undefined>;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const url = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== 'p') q.set(k, v);
    if (p > 1) q.set('p', String(p));
    const s = q.toString();
    return s ? `?${s}` : '?';
  };
  return (
    <div className="paginacion">
      <span>{total.toLocaleString('es-EC')} registros · página {pagina} de {paginas}</span>
      {pagina > 1 ? <Link className="btn chico" href={url(pagina - 1)}>‹ Anterior</Link> : <span className="btn chico" aria-disabled>‹ Anterior</span>}
      {pagina < paginas ? <Link className="btn chico" href={url(pagina + 1)}>Siguiente ›</Link> : <span className="btn chico" aria-disabled>Siguiente ›</span>}
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <div className="vacio">{children}</div>;
}
