import { requerirEmisor } from '@/lib/auth';
import { Cabecera } from '@/components/ui';
import { FormBodega } from '../FormBodega';

export default async function NuevaBodega() {
  await requerirEmisor();
  return (<><Cabecera titulo="Nueva bodega" /><FormBodega b={{}} /></>);
}
