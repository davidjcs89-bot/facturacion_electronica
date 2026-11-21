import Link from 'next/link';
import { requerirSesion, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { emisorResumen } from '@/lib/emisor';
import { MENU } from '@/lib/menu';
import { cerrarSesion } from '../../login/actions';
import { contarRevision } from '@/lib/revision';
import { GruposMas } from './GruposMas';

export const dynamic = 'force-dynamic';

/** Menú completo para el celular (botón «Más» de la barra de abajo) */
export default async function MasPage() {
  const s = await requerirSesion();
  const emisor = await emisorResumen(s.emisorId);
  const esAdmin = s.rol === ROL_ADMIN_SISTEMA;
  const grupos = MENU.filter((g) => (g.soloAdminSistema ? esAdmin : true)).filter((g) => (g.requiereEmisor ? !!emisor : true));
  const nombre = s.nombre || s.usuario;
  const rev = emisor && s.emisorId ? await contarRevision(s.emisorId) : { comprobantes: 0, productos: 0 };
  const iniciales = String(nombre).split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="menu-mas">
      <Link href="/mi-cuenta" className="card cuenta-mas">
        <span className="avatar">{iniciales}</span>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 }}>
          <strong>{nombre}</strong>
          {emisor && <span className="muted" style={{ fontSize: 13 }}>{emisor.razon_social} · RUC {emisor.ruc}</span>}
          <span style={{ fontSize: 13, color: 'var(--primary)' }}>Mi cuenta: datos y clave</span>
        </div>
        <span aria-hidden="true" className="muted" style={{ fontSize: 20 }}>›</span>
      </Link>
      <GruposMas grupos={grupos.map((g) => ({
        titulo: g.titulo,
        items: g.items.map((i) => ({ ...i, aviso: i.href === '/revision' ? rev.comprobantes + rev.productos : undefined })),
        aviso: g.items.some((i) => i.href === '/revision') ? { texto: 'Revisión', n: rev.comprobantes + rev.productos } : undefined,
      }))} />
      <section className="card sin-padding">
        {esAdmin && <Link href="/admin/emisores" className="item-mas">Cambiar de empresa<span aria-hidden="true">›</span></Link>}
        <form action={cerrarSesion}>
          <button className="item-mas" style={{ color: 'var(--danger)', width: '100%', background: 'none', border: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>Cerrar sesión</button>
        </form>
      </section>
    </div>
  );
}
