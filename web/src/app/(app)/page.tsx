import Link from 'next/link';
import { requerirSesion } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { money, fecha } from '@/lib/formato';
import { vozHabilitada } from '@/lib/voz/habilitada';
import { datosTablero } from '@/lib/tablero';

export default async function Inicio() {
  const s = await requerirSesion();
  const avisos = await sql<{ id: number; message: string; createon: Date }[]>`
    select id, message, createon from avisos where activo order by createon desc limit 5`;

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
  const t = await datosTablero(e);
  const v = t.ventas, o = t.otros;
  const hoyTxt = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }).format(new Date());
  const mesAnt = new Intl.DateTimeFormat('es-EC', { month: 'short', timeZone: 'America/Guayaquil' })
    .format(new Date(new Date().setDate(0))).replace('.', '');
  const cambio = v.ant_total > 0 ? Math.round(((v.mes_total - v.ant_total) / v.ant_total) * 100) : null;
  const n0 = (s.nombre || s.usuario || '').split(' ')[0];
  const nombre = n0.charAt(0).toUpperCase() + n0.slice(1).toLowerCase();

  const alertas: { href: string; n: number | string; t: string; sub: string; tono: 'rojo' | 'ambar' | 'gris' }[] = [];
  if (v.no_aut) alertas.push({ href: '/facturas?estado=7', n: v.no_aut, t: 'No autorizados hoy', sub: `El SRI rechazó ${v.no_aut} ${v.no_aut === 1 ? 'factura' : 'facturas'} de hoy`, tono: 'rojo' });
  if (t.correosFallidos) alertas.push({ href: '/correos-fallidos', n: t.correosFallidos, t: 'Correos que fallaron', sub: 'Comprobantes que no llegaron al cliente (7 días)', tono: 'rojo' });
  if (v.en_proceso) alertas.push({ href: '/facturas', n: v.en_proceso, t: 'En proceso en el SRI', sub: 'Enviadas hoy, esperando autorización', tono: 'gris' });
  if (v.borradores) alertas.push({ href: '/facturas?estado=1', n: v.borradores, t: 'Borradores de hoy', sub: 'Empezados y sin emitir', tono: 'gris' });
  if (t.revision.comprobantes) alertas.push({ href: '/revision', n: t.revision.comprobantes, t: 'En revisión', sub: 'Comprobantes de días anteriores', tono: 'ambar' });
  if (t.revision.productos) alertas.push({ href: '/revision?t=productos', n: t.revision.productos, t: 'Artículos con problemas', sub: 'IVA antiguo, sin precio o código repetido', tono: 'ambar' });
  if (o.firma_dias == null) alertas.push({ href: '/configuracion/emisor', n: '!', t: 'Firma electrónica', sub: 'No hay firma cargada', tono: 'rojo' });
  else if (o.firma_dias <= 60) alertas.push({
    href: '/configuracion/emisor', n: Math.max(o.firma_dias, 0), t: 'Firma electrónica',
    sub: o.firma_dias < 0 ? `Venció el ${fecha(o.firma_hasta!)}` : `días para que venza (${fecha(o.firma_hasta!)})`,
    tono: o.firma_dias <= 15 ? 'rojo' : 'ambar',
  });

  const max = Math.max(...v.serie.map((x) => x.t), 1);

  return (
    <div className="tablero">
      <Cabecera titulo={`Hola, ${nombre}`} sub={hoyTxt.charAt(0).toUpperCase() + hoyTxt.slice(1)}>
        {vozHabilitada(s.emisorId) && <Link href="/facturas/voz" className="btn solo-escritorio">🎤 Factura por voz</Link>}
        <Link href="/facturas/nueva" className="btn primario solo-escritorio">+ Nueva factura</Link>
      </Cabecera>

      <div className="tab-principal">
        <Link href="/reportes/facturas" className="card tab-ventas">
          <div className="tab-fila"><span className="tab-et">Ventas autorizadas</span><span className="muted chico">sin pruebas</span></div>
          <div className="tab-tres">
            <div><span className="muted chico">Hoy</span><strong>${money(v.hoy_total)}</strong><span className="muted chico">{v.hoy_n} {v.hoy_n === 1 ? 'factura' : 'facturas'}</span></div>
            <div><span className="muted chico">Este mes</span><strong>${money(v.mes_total)}</strong>
              {cambio == null ? <span className="muted chico">{v.mes_n} facturas</span>
                : <span className="chico" style={{ color: cambio >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{cambio >= 0 ? '▲' : '▼'} {Math.abs(cambio)} % vs {mesAnt}.</span>}</div>
            <div><span className="muted chico">30 días</span><strong>${money(v.d30_total)}</strong><span className="muted chico">{v.d30_n} facturas</span></div>
          </div>
          <svg className="tab-grafico" viewBox="0 0 280 60" preserveAspectRatio="none" role="img" aria-label="Ventas autorizadas por día, últimos 14 días">
            {v.serie.map((x, i) => {
              const h = Math.max((x.t / max) * 58, x.t > 0 ? 2 : 0.8);
              return <rect key={x.d} x={i * 20 + 2} y={60 - h} width={16} height={h} rx={2} fill={i === v.serie.length - 1 ? 'var(--primary)' : '#a9c1ea'}><title>{`${x.d}: $${money(x.t)}`}</title></rect>;
            })}
          </svg>
          <span className="muted chico">Últimos 14 días · toque para ver el reporte</span>
        </Link>

        <section className="tab-atencion">
          <span className="tab-et">Requiere atención</span>
          {alertas.length === 0 && <div className="tab-alerta verde"><strong>✓</strong><span><strong>Todo en orden</strong><span>No hay nada pendiente</span></span></div>}
          {alertas.map((a) => (
            <Link key={a.t} href={a.href} className={`tab-alerta ${a.tono}`}>
              <strong>{typeof a.n === 'number' ? a.n.toLocaleString('es-EC') : a.n}</strong>
              <span><strong>{a.t}</strong><span>{a.sub}</span></span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </section>
      </div>

      <div className="tab-kpis">
        <Kpi href="/pedidos?estado=1" t="Por cobrar" v={`$${money(o.por_cobrar)}`} sub={`${o.pedidos_saldo} ${o.pedidos_saldo === 1 ? 'pedido' : 'pedidos'} con saldo`} />
        <Kpi href="/compras" t="Compras del mes" v={`$${money(o.compras_total)}`} sub={`${o.compras_n} ${o.compras_n === 1 ? 'compra' : 'compras'}`} />
        <Kpi href="/clientes" t="Contactos" v={o.clientes.toLocaleString('es-EC')} sub="registrados" />
        <Kpi href="/productos?tipo=1" t="Artículos" v={o.articulos.toLocaleString('es-EC')} sub={o.agotados ? `${o.agotados} agotados` : 'en el catálogo'} />
        <Kpi href="/productos?tipo=2" t="Servicios" v={o.servicios.toLocaleString('es-EC')} sub="en el catálogo" />
        <Kpi href="/facturas?estado=6" t="Autorizadas" v={o.autorizadas.toLocaleString('es-EC')} sub="total histórico" />
      </div>

      <div className="tab-tops">
        <Top titulo="Más vendidos del mes" filas={t.vendidos.map((x) => [x.nombre, `${Number(x.valor).toLocaleString('es-EC', { maximumFractionDigits: 2 })} u.`])} />
        <Top titulo="Mejores clientes del mes" filas={t.mejoresClientes.map((x) => [x.nombre, `$${money(x.valor)}`])} />
      </div>
      <Avisos avisos={avisos} />
    </div>
  );
}

function Kpi({ href, t, v, sub }: { href: string; t: string; v: string; sub: string }) {
  return (
    <Link href={href} className="card tab-kpi">
      <span className="muted chico">{t}</span><strong>{v}</strong><span className="muted chico">{sub}</span>
    </Link>
  );
}

function Top({ titulo, filas }: { titulo: string; filas: string[][] }) {
  return (
    <section className="card tab-top">
      <span className="tab-et">{titulo}</span>
      {filas.length === 0 ? <span className="muted chico">Aún no hay ventas este mes.</span>
        : filas.map(([a, b], i) => <div key={i} className="tab-fila"><span className="tab-nombre">{a}</span><strong>{b}</strong></div>)}
    </section>
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
