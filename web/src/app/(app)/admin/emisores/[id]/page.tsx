import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { fecha, fechaInput, hoyEcuadorISO, money } from '@/lib/formato';
import { Cabecera } from '@/components/ui';
import { FormHabilitacion } from '../FormHabilitacion';
import { trabajarConEmisor } from '../actions';

export default async function AdminEmisor({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdminSistema();
  const id = Number((await params).id) || 0;
  const [e] = await sql`
    select e.*, a.descripcion_ambiente ambiente, h.fecha_desde, h.fecha_hasta,
      (select titular from firma_emisor f where f.id_emisor = e.id) firma_titular,
      (select valido_hasta from firma_emisor f where f.id_emisor = e.id) firma_hasta
    from emisor e join tipo_ambientes a on a.id = e.tipo_ambiente left join emisor_habilitacion h on h.id_emisor = e.id
    where e.id = ${id}`;
  if (!e) notFound();
  const usuarios = await sql<{ id: number; nombre_usuario: string; nombre: string; apellido: string; correo: string; estado: number }[]>`
    select id, nombre_usuario, nombre, apellido, correo, estado from usuario where id_emisor = ${id} order by id`;
  const [act] = await sql<{ n: number; total: number }[]>`
    select count(*) n, coalesce(sum(total), 0) total from factura
    where id_emisor = ${id} and estado = 6 and fecha_emision >= (now() at time zone 'America/Guayaquil') - interval '30 days'`;
  return (
    <>
      <Cabecera titulo={e.razon_social} sub={`RUC ${e.ruc} · ${e.nombre_comercial}`}>
        <form action={trabajarConEmisor}><input type="hidden" name="id" value={id} /><button className="btn primario">Trabajar con este emisor</button></form>
        <Link className="btn" href="/admin/emisores">Volver</Link>
      </Cabecera>
      <div className="grid c2">
        <div className="card">
          <h2>Datos</h2>
          <dl className="datos">
            <dt>Dirección</dt><dd>{e.direccion_matriz}</dd>
            <dt>Ambiente</dt><dd>{e.ambiente}</dd>
            <dt>Contabilidad</dt><dd>{e.obligado_conta ? 'Obligado' : 'No obligado'}</dd>
            <dt>Firma</dt><dd>{e.firma_titular ? `${e.firma_titular} (hasta ${fecha(e.firma_hasta)})` : 'No cargada en la app nueva'}</dd>
            <dt>Últimos 30 días</dt><dd>{act.n} facturas autorizadas · ${money(act.total)}</dd>
            <dt>Creado</dt><dd>{fecha(e.fecha_creacion)}</dd>
          </dl>
        </div>
        <FormHabilitacion id={id} estado={e.estado}
          desde={e.fecha_desde ? fechaInput(e.fecha_desde) : hoyEcuadorISO()}
          hasta={e.fecha_hasta ? fechaInput(e.fecha_hasta) : hoyEcuadorISO()} />
      </div>
      <div className="card sin-padding">
        <div style={{ padding: '14px 16px 0' }}><h2>Usuarios</h2></div>
        <table className="tabla">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Estado</th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td><Link href={`/admin/usuarios/${u.id}`}>{u.nombre_usuario}</Link></td>
                <td>{u.nombre} {u.apellido}</td><td>{u.correo?.toLowerCase()}</td>
                <td>{u.estado === 1 ? 'Activo' : u.estado === 2 ? 'Inactivo' : 'Eliminado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
