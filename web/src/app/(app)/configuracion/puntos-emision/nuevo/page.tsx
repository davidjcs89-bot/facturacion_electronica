import { requerirEmisor } from '@/lib/auth';
import { Cabecera } from '@/components/ui';
import { FormPunto } from '../FormPunto';
import { datosFormulario } from '../datos';

export default async function NuevoPunto() {
  const s = await requerirEmisor();
  const d = await datosFormulario(s.emisorId, null);
  return (<><Cabecera titulo="Nuevo punto de emisión" /><FormPunto p={{}} {...d} /></>);
}
