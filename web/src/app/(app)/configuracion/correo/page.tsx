import Link from 'next/link';
import { requerirSesion, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Alerta } from '@/components/ui';

export default async function ConfigCorreo() {
  const s = await requerirSesion();
  const [c] = await sql<{ direccion: string; nombre_mostrar: string; servidor: string; puerto: number }[]>`
    select direccion, nombre_mostrar, servidor, puerto from cuentas_correo order by id limit 1`;
  const [u] = await sql<{ correo: string }[]>`select correo from usuario where id = ${s.uid}`;
  return (
    <>
      <Cabecera titulo="Correo de envío" sub="Cuenta desde la que se envían los comprobantes autorizados a sus clientes">
        {s.rol === ROL_ADMIN_SISTEMA && <Link className="btn primario" href="/admin/correos">Administrar cuentas</Link>}
      </Cabecera>
      <div className="card">
        {c ? (
          <dl className="datos">
            <dt>Remitente</dt><dd>{c.nombre_mostrar} &lt;{c.direccion}&gt;</dd>
            <dt>Servidor</dt><dd>{c.servidor}:{c.puerto}</dd>
            <dt>Copia al emisor</dt><dd>{u?.correo?.toLowerCase() || '—'}</dd>
          </dl>
        ) : (
          <Alerta tipo="aviso">No hay una cuenta de correo configurada: los comprobantes no se enviarán por correo.</Alerta>
        )}
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          A cada cliente se le envía el RIDE (PDF) y el XML autorizado al correo registrado en su ficha. La cuenta de envío es común para todos
          los emisores y solo la puede cambiar el administrador del sistema.
        </p>
      </div>
    </>
  );
}
