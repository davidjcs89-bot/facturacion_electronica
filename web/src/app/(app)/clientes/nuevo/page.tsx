import { requerirEmisor } from '@/lib/auth';
import { tiposCliente, tiposIdentificacion } from '@/lib/catalogos';
import { leerParams, type SP } from '@/lib/params';
import { Cabecera } from '@/components/ui';
import { FormCliente } from '../FormCliente';

export default async function NuevoCliente({ searchParams }: { searchParams: SP }) {
  await requerirEmisor();
  const p = await leerParams(searchParams);
  const [tiposId, tiposCli] = await Promise.all([tiposIdentificacion(), tiposCliente()]);
  return (
    <>
      <Cabecera titulo="Nuevo cliente" />
      <FormCliente cliente={{ tipo_cliente: p.tipo ? Number(p.tipo) : 1, identificacion: p.identificacion }} tiposId={tiposId} tiposCli={tiposCli} volver={p.volver} />
    </>
  );
}
