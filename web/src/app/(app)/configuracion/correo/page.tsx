import Link from 'next/link';
import { requerirEmisor, ROL_ADMIN_SISTEMA } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Alerta } from '@/components/ui';
import { FormCorreoEmisor, FormPruebaEmisor } from './Formularios';
import { quitarCorreoEmisor } from './actions';

export default async function ConfigCorreo() {
  const s = await requerirEmisor();
  const [c] = await sql<{ direccion: string; servidor: string; puerto: number; seguridad: string; usuario: string; copia_a: string | null; verificado_en: Date | null }[]>`
    select direccion, servidor, puerto, seguridad, usuario, copia_a, verificado_en from emisor_correo where id_emisor = ${s.emisorId}`;
  const [e] = await sql<{ nombre_comercial: string }[]>`select nombre_comercial from emisor where id = ${s.emisorId}`;
  const [u] = await sql<{ correo: string }[]>`select correo from usuario where id = ${s.uid}`;
  return (
    <>
      <Cabecera titulo="Correo de envío" sub="Cuenta de su empresa desde la que se envían comprobantes, proformas y pedidos a sus clientes">
        {s.rol === ROL_ADMIN_SISTEMA && <Link className="btn" href="/admin/correos">Correo del sistema</Link>}
      </Cabecera>
      {!c && <Alerta tipo="aviso">Su empresa aún no tiene correo de envío: los comprobantes se autorizan igual, pero no se envían a los clientes.</Alerta>}
      {c && !c.verificado_en && <Alerta tipo="aviso">La conexión funciona, pero falta enviar un correo de prueba para confirmar que llega.</Alerta>}
      {c && (
        <div className="card">
          <dl className="datos">
            <dt>El cliente ve</dt><dd>{e?.nombre_comercial} &lt;{c.direccion}&gt;</dd>
            <dt>Servidor</dt><dd>{c.servidor}:{c.puerto} ({c.seguridad === 'SSL' ? 'SSL / TLS' : 'STARTTLS'})</dd>
            <dt>Copia oculta</dt><dd>{c.copia_a || '—'}</dd>
            <dt>Verificado</dt><dd>{c.verificado_en ? new Date(c.verificado_en).toLocaleString('es-EC') : 'No'}</dd>
          </dl>
          <FormPruebaEmisor sugerido={u?.correo?.toLowerCase() ?? ''} />
          <form action={quitarCorreoEmisor} style={{ marginTop: 10 }}>
            <button className="btn peligro">Quitar cuenta</button>
          </form>
        </div>
      )}
      <FormCorreoEmisor c={c ? { direccion: c.direccion, servidor: c.servidor, puerto: c.puerto, seguridad: c.seguridad, usuario: c.usuario, copia_a: c.copia_a } : null} />
    </>
  );
}
