import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, type SP } from '@/lib/params';
import { Alerta, Cabecera } from '@/components/ui';
import { FormUsuario } from '../FormUsuario';
import { opcionesUsuario } from '../datos';
import { eliminarUsuario } from '../actions';
import { BotonBorrar } from '../../_comun/BotonBorrar';

export default async function EditarUsuario({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requerirAdminSistema();
  const id = Number((await params).id) || 0;
  const p = await leerParams(searchParams);
  const [u] = await sql`
    select id, nombre_usuario, nombre, apellido, correo, numero_telefono, direccion_dom_cuenta, ciudad, provincia,
      estado, id_categoria, id_rol, id_emisor, notificaciones
    from usuario where id = ${id}`;
  if (!u) notFound();
  const op = await opcionesUsuario();
  return (
    <>
      <Cabecera titulo={u.nombre_usuario} sub={`${u.nombre} ${u.apellido}`}><Link className="btn" href="/admin/usuarios">Volver</Link></Cabecera>
      {p.guardado && <Alerta tipo="ok">Usuario guardado.</Alerta>}
      {p.error === 'propio' && <Alerta tipo="error">No puede eliminar su propio usuario.</Alerta>}
      <FormUsuario u={u} {...op} />
      <form action={eliminarUsuario}><input type="hidden" name="id" value={id} /><BotonBorrar texto="Eliminar usuario" pregunta="¿Dar de baja este usuario? No podrá ingresar." /></form>
    </>
  );
}
