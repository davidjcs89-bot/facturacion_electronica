import Link from 'next/link';
import { requerirSesion, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { emisorResumen } from '@/lib/emisor';
import { MENU } from '@/lib/menu';
import { cerrarSesion } from '../../login/actions';

export const dynamic = 'force-dynamic';

/** Menú completo para el celular (botón «Más» de la barra de abajo) */
export default async function MasPage() {
  const s = await requerirSesion();
  const emisor = await emisorResumen(s.emisorId);
  const esAdmin = s.rol === ROL_ADMIN_SISTEMA;
  const grupos = MENU.filter((g) => (g.soloAdminSistema ? esAdmin : true)).filter((g) => (g.requiereEmisor ? !!emisor : true));
  const nombre = s.nombre || s.usuario;
  const iniciales = String(nombre).split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="menu-mas">
      <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="avatar">{iniciales}</span>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <strong>{nombre}</strong>
          {emisor && <span className="muted" style={{ fontSize: 13 }}>{emisor.razon_social} · RUC {emisor.ruc}</span>}
        </div>
      </section>
      {grupos.map((g) => (
        <section key={g.titulo} className="card sin-padding">
          <div className="grupo-mas">{g.titulo}</div>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} className="item-mas">{i.texto}<span aria-hidden="true">›</span></Link>
          ))}
        </section>
      ))}
      <section className="card sin-padding">
        {esAdmin && <Link href="/admin/emisores" className="item-mas">Cambiar de empresa<span aria-hidden="true">›</span></Link>}
        <form action={cerrarSesion}>
          <button className="item-mas" style={{ color: 'var(--danger)', width: '100%', background: 'none', border: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>Cerrar sesión</button>
        </form>
      </section>
    </div>
  );
}
