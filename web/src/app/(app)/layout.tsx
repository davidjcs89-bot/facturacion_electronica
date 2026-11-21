import Link from 'next/link';
import { requerirSesion, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { emisorResumen } from '@/lib/emisor';
import { Sidebar } from '@/components/Sidebar';
import { NavMovil } from '@/components/NavMovil';
import { vozHabilitada } from '@/lib/voz/habilitada';
import { cerrarSesion } from '../login/actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requerirSesion();
  const emisor = await emisorResumen(s.emisorId);
  const esAdmin = s.rol === ROL_ADMIN_SISTEMA;
  return (
    <div className="shell">
      <Sidebar esAdmin={esAdmin} tieneEmisor={!!emisor} />
      <div className="main">
        <header className="topbar">
          <div className="emisor">
            {emisor ? (
              <>
                <span className="nombre-emisor">{emisor.razon_social}</span>
                <span className={`punto-amb ${emisor.tipo_ambiente === 2 ? 'prod' : 'prueba'}`}>{emisor.tipo_ambiente === 2 ? "Producción" : "Pruebas"}</span>
                <small>
                  RUC {emisor.ruc} · Ambiente:{' '}
                  <span className={`badge ${emisor.tipo_ambiente === 2 ? 'e6' : 'e1'}`}>{emisor.tipo_ambiente === 2 ? "Producción" : "Pruebas"}</span>
                  {esAdmin && <> · <Link href="/admin/emisores">cambiar emisor</Link></>}
                </small>
              </>
            ) : (
              <span className="muted">{esAdmin ? 'Administración del sistema' : 'Sin emisor configurado'}</span>
            )}
          </div>
          <Link href="/mas" className="mas-movil" aria-label="Más opciones: menú completo, empresa y cerrar sesión">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            <span>Más</span>
          </Link>
          <div className="usuario">
            <span>{s.nombre || s.usuario}</span>
            <form action={cerrarSesion}>
              <button className="btn chico">Cerrar sesión</button>
            </form>
          </div>
        </header>
        <main className="contenido">{children}</main>
        <NavMovil voz={!!emisor && vozHabilitada(s.emisorId)} tieneEmisor={!!emisor} />
      </div>
    </div>
  );
}
