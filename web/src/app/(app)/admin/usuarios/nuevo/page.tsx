import { requerirAdminSistema } from '@/lib/auth';
import { Cabecera } from '@/components/ui';
import { FormUsuario } from '../FormUsuario';
import { opcionesUsuario } from '../datos';

export default async function NuevoUsuario() {
  await requerirAdminSistema();
  const op = await opcionesUsuario();
  return (<><Cabecera titulo="Nuevo usuario" /><FormUsuario u={{ estado: 1, id_rol: 2, id_categoria: 4 }} {...op} /></>);
}
