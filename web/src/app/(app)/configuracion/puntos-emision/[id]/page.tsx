import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, type SP } from '@/lib/params';
import { Alerta, Cabecera } from '@/components/ui';
import { FormPunto } from '../FormPunto';
import { datosFormulario } from '../datos';
import { eliminarPunto } from '../actions';
import { BotonBorrar } from '../../../admin/_comun/BotonBorrar';

export default async function EditarPunto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const p = await leerParams(searchParams);
  const [punto] = await sql`select * from puntos_emisior where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!punto) notFound();
  const d = await datosFormulario(s.emisorId, id);
  return (
    <>
      <Cabecera titulo={`Punto ${punto.numero_establecimiento}-${punto.numero_emision}`} sub={punto.direccion}>
        <Link className="btn" href="/configuracion/puntos-emision">Volver</Link>
      </Cabecera>
      {p.guardado && <Alerta tipo="ok">Punto de emisión guardado.</Alerta>}
      {p.error === 'uso' && <Alerta tipo="error">No se puede eliminar: el punto tiene comprobantes emitidos.</Alerta>}
      <FormPunto p={punto} {...d} />
      <form action={eliminarPunto}><input type="hidden" name="id" value={id} /><BotonBorrar texto="Eliminar punto de emisión" /></form>
    </>
  );
}
