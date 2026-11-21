import { requerirSesion } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { FormMisDatos, FormMiClave } from './Formularios';

export const dynamic = 'force-dynamic';

export default async function MiCuenta() {
  const s = await requerirSesion();
  const [u] = await sql<{ nombre_usuario: string; nombre: string; apellido: string; correo: string | null; numero_telefono: string | null;
    direccion_dom_cuenta: string | null; ciudad: string | null; provincia: string | null }[]>`
    select nombre_usuario, nombre, apellido, correo, numero_telefono, direccion_dom_cuenta, ciudad, provincia from usuario where id = ${s.uid}`;
  return (
    <>
      <Cabecera titulo="Mi cuenta" sub={`Usuario: ${u.nombre_usuario}`} />
      <FormMisDatos u={u} />
      <FormMiClave />
      <div className="card">
        <h2>Datos que cambia el administrador</h2>
        <div className="muted">Correo: {u.correo?.toLowerCase() || '—'} · Teléfono: {u.numero_telefono || '—'}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Para cambiar el usuario, el correo o el teléfono, pídalo al administrador del sistema.</div>
      </div>
    </>
  );
}
