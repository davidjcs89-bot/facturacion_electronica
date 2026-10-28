import Link from 'next/link';
import { requerirSesion, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { emisorResumen } from '@/lib/emisor';
import { Sidebar } from '@/components/Sidebar';
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
                {emisor.razon_social}
                <small>
                  RUC {emisor.ruc} · Ambiente:{' '}
                  <span className={`badge ${emisor.tipo_ambiente === 2 ? 'e6' : 'e1'}`}>{emisor.ambiente}</span>
                  {esAdmin && <> · <Link href="/admin/emisores">cambiar emisor</Link></>}
                </small>
              </>
            ) : (
              <span className="muted">{esAdmin ? 'Administración del sistema' : 'Sin emisor configurado'}</span>
            )}
          </div>
          <div className="usuario">
            <span>{s.nombre || s.usuario}</span>
            <form action={cerrarSesion}>
              <button className="btn chico">Cerrar sesión</button>
            </form>
          </div>
        </header>
        <main className="contenido">{children}</main>
      </div>
    </div>
  );
}
