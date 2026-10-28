import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { tiposCliente, tiposIdentificacion } from '@/lib/catalogos';
import { leerParams, type SP } from '@/lib/params';
import { Alerta, Cabecera } from '@/components/ui';
import { FormCliente } from '../FormCliente';

export default async function EditarCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const s = await requerirEmisor();
  const { id } = await params;
  const p = await leerParams(searchParams);
  const [c] = await sql`select * from clientes where id = ${Number(id) || 0} and id_emisor = ${s.emisorId}`;
  if (!c) notFound();
  const [tiposId, tiposCli] = await Promise.all([tiposIdentificacion(), tiposCliente()]);
  return (
    <>
      <Cabecera titulo={c.nombre_cliente} sub={`Identificación ${c.identificacion}`} />
      {p.guardado && <Alerta tipo="ok">Cliente guardado.</Alerta>}
      <FormCliente cliente={c} tiposId={tiposId} tiposCli={tiposCli} />
    </>
  );
}
