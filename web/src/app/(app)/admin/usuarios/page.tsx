import Link from 'next/link';
import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { leerParams, paginaDe, type SP } from '@/lib/params';
import { Cabecera, Paginacion, Vacio } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { ESTADOS_CUENTA, CLASE_ESTADO } from '../_comun/estados';

const POR_PAGINA = 50;

export default async function Usuarios({ searchParams }: { searchParams: SP }) {
  await requerirAdminSistema();
  const p = await leerParams(searchParams);
  const pagina = paginaDe(p);
  const q = (p.q ?? '').trim();
  const estado = p.estado ?? 'visibles';
  const filtro = sql`where true
    ${q ? sql`and (u.nombre_usuario ilike ${'%' + q + '%'} or u.nombre ilike ${'%' + q + '%'} or u.apellido ilike ${'%' + q + '%'} or u.correo ilike ${'%' + q + '%'} or e.razon_social ilike ${'%' + q + '%'})` : sql``}
    ${estado === 'visibles' ? sql`and u.estado <> 3` : estado ? sql`and u.estado = ${Number(estado)}` : sql``}`;
  const [{ total }] = await sql<{ total: number }[]>`select count(*) total from usuario u left join emisor e on e.id = u.id_emisor ${filtro}`;
  const filas = await sql<{ id: number; nombre_usuario: string; nombre: string; apellido: string; correo: string; estado: number; id_rol: number; emisor: string | null; fecha_creacion: Date }[]>`
    select u.id, u.nombre_usuario, u.nombre, u.apellido, u.correo, u.estado, u.id_rol, e.razon_social emisor, u.fecha_creacion
    from usuario u left join emisor e on e.id = u.id_emisor
    ${filtro} order by u.id desc limit ${POR_PAGINA} offset ${(pagina - 1) * POR_PAGINA}`;
  return (
    <>
      <Cabecera titulo="Usuarios"><Link href="/admin/usuarios/nuevo" className="btn primario">+ Nuevo usuario</Link></Cabecera>
      <form className="filtros">
        <div className="campo busqueda"><label>Buscar</label><input name="q" defaultValue={q} placeholder="Usuario, nombre, correo o emisor" /></div>
        <div className="campo"><label>Estado</label>
          <select name="estado" defaultValue={estado}>
            <option value="visibles">Todos menos eliminados</option><option value="">Todos</option>
            {Object.entries(ESTADOS_CUENTA).filter(([k]) => k !== '0').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn">Buscar</button>
      </form>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay usuarios.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Emisor</th><th>Rol</th><th>Estado</th><th>Creado</th></tr></thead>
              <tbody>
                {filas.map((u) => (
                  <tr key={u.id}>
                    <td><Link href={`/admin/usuarios/${u.id}`}>{u.nombre_usuario}</Link></td>
                    <td>{u.nombre} {u.apellido}</td>
                    <td>{u.correo?.toLowerCase()}</td>
                    <td>{u.emisor ?? '—'}</td>
                    <td>{u.id_rol === 1 ? 'Admin sistema' : 'Admin empresa'}</td>
                    <td><span className={`badge ${CLASE_ESTADO[u.estado] ?? 'e1'}`}>{ESTADOS_CUENTA[u.estado] ?? u.estado}</span></td>
                    <td className="nowrap">{fecha(u.fecha_creacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} params={p} />
      </div>
    </>
  );
}
