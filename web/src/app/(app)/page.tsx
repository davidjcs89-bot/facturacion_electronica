import Link from 'next/link';
import { requerirSesion } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Estado } from '@/components/ui';
import { money, fecha } from '@/lib/formato';

export default async function Inicio() {
  const s = await requerirSesion();
  const avisos = await sql<{ id: number; message: string; createon: Date }[]>`
    select id, message, createon from avisos order by createon desc limit 5`;

  if (!s.emisorId) {
    const [r] = await sql<{ emisores: number; usuarios: number }[]>`
      select (select count(*) from emisor) emisores, (select count(*) from usuario where estado = 1) usuarios`;
    return (
      <>
        <Cabecera titulo="Administración" sub={`Bienvenido, ${s.nombre || s.usuario}`} />
        <div className="grid c3">
          <div className="card kpi"><div className="valor">{r.emisores}</div><div className="etiqueta">Emisores</div></div>
          <div className="card kpi"><div className="valor">{r.usuarios}</div><div className="etiqueta">Usuarios activos</div></div>
        </div>
        <p><Link href="/admin/emisores">Elija un emisor</Link> para trabajar con sus comprobantes.</p>
        <Avisos avisos={avisos} />
      </>
    );
  }

  const e = s.emisorId;
  const [kpi] = await sql<{ mes_total: number; mes_n: number; autorizadas: number; no_aut: number; pendientes: number }[]>`
    select
      coalesce(sum(total) filter (where estado = 6), 0) mes_total,
      count(*) filter (where estado = 6) mes_n,
      (select count(*) from factura where id_emisor = ${e} and estado = 6) autorizadas,
      (select count(*) from factura where id_emisor = ${e} and estado in (5, 7)) no_aut,
      (select count(*) from factura where id_emisor = ${e} and estado in (1, 3, 4)) pendientes
    from factura
    where id_emisor = ${e}
      and fecha_emision >= date_trunc('month', now() at time zone 'America/Guayaquil')`;
  const ultimas = await sql<{ id: number; numero: string; fecha_emision: Date; total: number; estado: number; cliente: string }[]>`
    select f.id, f.numero, f.fecha_emision, f.total, f.estado, c.nombre_cliente cliente
    from factura f join clientes c on c.id = f.id_cliente
    where f.id_emisor = ${e}
    order by f.fecha_emision desc, f.id desc
    limit 10`;

  return (
    <>
      <Cabecera titulo="Inicio" sub={`Bienvenido, ${s.nombre || s.usuario}`}>
        <Link href="/facturas/nueva" className="btn primario">+ Nueva factura</Link>
      </Cabecera>
      <div className="grid c4">
        <div className="card kpi"><div className="valor">${money(kpi.mes_total)}</div><div className="etiqueta">Facturado este mes ({kpi.mes_n} autorizadas)</div></div>
        <div className="card kpi"><div className="valor">{kpi.autorizadas.toLocaleString('es-EC')}</div><div className="etiqueta">Facturas autorizadas (total)</div></div>
        <div className="card kpi"><div className="valor">{kpi.pendientes}</div><div className="etiqueta">Facturas en proceso</div></div>
        <div className="card kpi"><div className="valor" style={{ color: kpi.no_aut ? 'var(--danger)' : undefined }}>{kpi.no_aut}</div><div className="etiqueta"><Link href="/no-autorizados">No recibidas / no autorizadas</Link></div></div>
      </div>
      <div className="card sin-padding">
        <div style={{ padding: '14px 16px 0' }}><h2>Últimas facturas</h2></div>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {ultimas.map((f) => (
                <tr key={f.id}>
                  <td className="nowrap"><Link href={`/facturas/${f.id}`}>{f.numero}</Link></td>
                  <td className="nowrap">{fecha(f.fecha_emision)}</td>
                  <td>{f.cliente}</td>
                  <td className="num">{money(f.total)}</td>
                  <td><Estado id={f.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Avisos avisos={avisos} />
    </>
  );
}

function Avisos({ avisos }: { avisos: { id: number; message: string; createon: Date }[] }) {
  if (!avisos.length) return null;
  return (
    <div className="card">
      <h2>Avisos</h2>
      {avisos.map((a) => (
        <div key={a.id} style={{ marginBottom: 10 }}>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{fecha(a.createon)}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{a.message}</div>
        </div>
      ))}
    </div>
  );
}
