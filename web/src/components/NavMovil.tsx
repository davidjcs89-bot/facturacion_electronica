'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
function Icono({ n, s = 22 }: { n: string; s?: number }) {
  const d: Record<string, React.ReactNode> = {
    inicio: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
    facturas: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    clientes: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
    mas: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></>,
    teclado: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" /></>,
    doc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 9h6M9 13h6" /></>,
    caja: <><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /></>,
    flecha: <path d="M9 5l7 7-7 7" />,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" {...P}>{d[n]}</svg>;
}

/** Barra fija de abajo en el celular: Inicio · Facturas · + Nueva · Clientes · Más */
export function NavMovil({ voz, tieneEmisor }: { voz: boolean; tieneEmisor: boolean }) {
  const ruta = usePathname();
  const [hoja, setHoja] = useState(false);
  useEffect(() => setHoja(false), [ruta]);
  // Pantallas que ya tienen su propia barra fija abajo
  if (ruta.startsWith('/facturas/voz')) return null;
  const activo = (h: string) => (h === '/' ? ruta === '/' : ruta === h || ruta.startsWith(h + '/'));
  const opciones = [
    ...(voz ? [{ href: '/facturas/voz', n: 'mic', t: 'Factura por voz', s: 'Dices el cliente, los productos y el pago', pri: true }] : []),
    { href: '/facturas/nueva', n: 'teclado', t: 'Factura', s: 'Eliges cliente y productos tocando', pri: !voz },
    { href: '/proformas/nueva', n: 'doc', t: 'Proforma', s: 'Cotización para el cliente', pri: false },
    { href: '/pedidos/nuevo', n: 'caja', t: 'Pedido', s: 'Separar productos para entregar', pri: false },
  ];
  return (
    <>
      <nav className="nav-movil" aria-label="Menú principal">
        <Link href="/" className={activo('/') ? 'on' : ''}><Icono n="inicio" /><span>Inicio</span></Link>
        <Link href="/facturas" className={activo('/facturas') ? 'on' : ''}><Icono n="facturas" /><span>Facturas</span></Link>
        {tieneEmisor ? (
          <button type="button" className="centro" onClick={() => setHoja(true)} aria-label="Crear nuevo comprobante">
            <span className="circ"><Icono n="plus" s={26} /></span><span>Nueva</span>
          </button>
        ) : <span style={{ minWidth: 60 }} />}
        <Link href="/clientes" className={activo('/clientes') ? 'on' : ''}><Icono n="clientes" /><span>Clientes</span></Link>
        <Link href="/mas" className={activo('/mas') ? 'on' : ''}><Icono n="mas" /><span>Más</span></Link>
      </nav>
      {hoja && (
        <div className="hoja-fondo" onClick={() => setHoja(false)}>
          <section className="hoja" role="dialog" aria-label="¿Qué quieres crear?" onClick={(e) => e.stopPropagation()}>
            <span className="asa" />
            <strong style={{ fontSize: 18 }}>¿Qué quieres crear?</strong>
            {opciones.map((o) => (
              <Link key={o.href} href={o.href} className="opcion">
                <span className={`ico ${o.pri ? 'pri' : ''}`}><Icono n={o.n} s={24} /></span>
                <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ fontSize: 16 }}>{o.t}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{o.s}</span>
                </span>
                <Icono n="flecha" s={18} />
              </Link>
            ))}
            <button type="button" className="btn" style={{ minHeight: 44, marginTop: 8 }} onClick={() => setHoja(false)}>Cancelar</button>
          </section>
        </div>
      )}
    </>
  );
}
