import { requerirEmisor } from '@/lib/auth';
import { tiposIdentificacion } from '@/lib/catalogos';
import { Cabecera } from '@/components/ui';
import { FormTransportista } from '../FormTransportista';

export default async function NuevoTransportista() {
  await requerirEmisor();
  const tipos = (await tiposIdentificacion()).filter((t) => t.id !== 4);
  return (<><Cabecera titulo="Nuevo transportista" /><FormTransportista t={{}} tipos={tipos} /></>);
}
