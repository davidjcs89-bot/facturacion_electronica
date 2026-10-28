import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { tiposCliente, tiposIdentificacion } from '@/lib/catalogos';
import { leerParams, type SP } from '@/lib/params';
import { fechaHora } from '@/lib/formato';
import { Alerta, Cabecera } from '@/components/ui';
import { FormCliente } from '../FormCliente';
import { FormFicha, FormNota } from '../FichaNotas';
import { eliminarNota } from '../fichas';
import { BotonBorrar } from '../../admin/_comun/BotonBorrar';

export default async function EditarCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const s = await requerirEmisor();
  const { id } = await params;
  const idC = Number(id) || 0;
  const p = await leerParams(searchParams);
  const [c] = await sql`select * from clientes where id = ${idC} and id_emisor = ${s.emisorId}`;
  if (!c) notFound();
  const [tiposId, tiposCli, atributos, notas] = await Promise.all([
    tiposIdentificacion(),
    tiposCliente(),
    sql<{ id: number; nombre: string; valor: string | null }[]>`
      select a.id, a.nombre, (select f.valor from fichas_clientes f where f.id_atributo = a.id and f.id_cliente = ${idC} order by f.id desc limit 1) valor
      from atributos_fichas_clientes a where a.id_emisor = ${s.emisorId} order by a.nombre`,
    sql<{ id: number; nota: string; fecha_creacion: Date; usuario: string | null }[]>`
      select n.id, n.nota, n.fecha_creacion, u.nombre_usuario usuario
      from datos_adicionales_cliente n left join usuario u on u.id = n.id_usuario
      where n.id_cliente = ${idC} order by n.fecha_creacion desc`,
  ]);
  return (
    <>
      <Cabecera titulo={c.nombre_cliente} sub={`Identificación ${c.identificacion}`}>
        <Link className="btn" href={`/facturas?q=${encodeURIComponent(c.identificacion)}`}>Ver facturas</Link>
        <Link className="btn" href="/clientes">Volver</Link>
      </Cabecera>
      {p.guardado && <Alerta tipo="ok">Cliente guardado.</Alerta>}
      <FormCliente cliente={c} tiposId={tiposId} tiposCli={tiposCli} />
      <div className="grid c2">
        <FormFicha idCliente={idC} atributos={atributos} />
        <div className="card">
          <h2>Notas</h2>
          <FormNota idCliente={idC} />
          {notas.map((n) => (
            <div key={n.id} style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8 }}>
              <div className="acciones" style={{ justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: '0.82rem' }}>{fechaHora(n.fecha_creacion)}{n.usuario ? ` · ${n.usuario}` : ''}</span>
                <form action={eliminarNota}>
                  <input type="hidden" name="id_cliente" value={idC} /><input type="hidden" name="id_nota" value={n.id} />
                  <BotonBorrar chico texto="Quitar" pregunta="¿Eliminar esta nota?" />
                </form>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{n.nota}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
