import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { FormBodega } from '../FormBodega';

export default async function EditarBodega({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const [b] = await sql<{ id: number; codigo: string; nombre: string; activa: boolean }[]>`
    select id, codigo, nombre, activa from bodegas where id = ${Number((await params).id) || 0} and id_emisor = ${s.emisorId}`;
  if (!b) notFound();
  return (
    <>
      <Cabecera titulo={`Bodega ${b.codigo}`}><Link className="btn" href={`/existencias?bodega=${b.id}`}>Ver existencias</Link></Cabecera>
      <FormBodega b={b} />
    </>
  );
}
