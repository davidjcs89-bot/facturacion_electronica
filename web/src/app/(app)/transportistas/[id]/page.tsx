import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { tiposIdentificacion } from '@/lib/catalogos';
import { leerParams, type SP } from '@/lib/params';
import { Alerta, Cabecera } from '@/components/ui';
import { FormTransportista } from '../FormTransportista';
import { eliminarTransportista } from '../actions';
import { BotonBorrar } from '../../admin/_comun/BotonBorrar';

export default async function EditarTransportista({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const p = await leerParams(searchParams);
  const [t] = await sql`select * from transportistas where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!t) notFound();
  const tipos = (await tiposIdentificacion()).filter((x) => x.id !== 4);
  return (
    <>
      <Cabecera titulo={t.nombre} sub={`Placa ${t.placa}`}><Link className="btn" href="/transportistas">Volver</Link></Cabecera>
      {p.guardado && <Alerta tipo="ok">Transportista guardado.</Alerta>}
      {p.error === 'uso' && <Alerta tipo="error">No se puede eliminar: tiene guías de remisión.</Alerta>}
      <FormTransportista t={t} tipos={tipos} />
      <form action={eliminarTransportista}><input type="hidden" name="id" value={id} /><BotonBorrar texto="Eliminar transportista" /></form>
    </>
  );
}
