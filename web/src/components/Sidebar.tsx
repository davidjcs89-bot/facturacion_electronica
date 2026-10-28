'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MENU } from '@/lib/menu';

export function Sidebar({ esAdmin, tieneEmisor }: { esAdmin: boolean; tieneEmisor: boolean }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const grupos = MENU.filter((g) => (g.soloAdminSistema ? esAdmin : true)).filter((g) => (g.requiereEmisor ? tieneEmisor : true));
  return (
    <>
      <button className="btn chico menu-movil" style={{ position: 'fixed', left: 10, bottom: 10, zIndex: 60 }} onClick={() => setAbierto(!abierto)}>
        ☰ Menú
      </button>
      <nav className={`sidebar ${abierto ? 'abierto' : ''}`} onClick={() => setAbierto(false)}>
        <Link href="/" className="marca">
          Facturación
          <small>Comprobantes electrónicos</small>
        </Link>
        <Link href="/" className={`item ${ruta === '/' ? 'activo' : ''}`}>Inicio</Link>
        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="grupo">{g.titulo}</div>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className={`item ${ruta === i.href || ruta.startsWith(i.href + '/') ? 'activo' : ''}`}>
                {i.texto}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}
