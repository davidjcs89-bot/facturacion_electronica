import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { Cabecera, Estado, Vacio } from '@/components/ui';
import { fecha, money } from '@/lib/formato';
import { comprobantesEnRevision, productosEnRevision } from '@/lib/revision';
import { AccionesComprobante, CorregirIva } from './Acciones';
import type { SP } from '@/lib/params';

export const dynamic = 'force-dynamic';

/**
 * Revisión: lo que quedó con problema en días anteriores. Regla: nada antiguo se envía al SRI;
 * aquí solo se ofrecen opciones y una persona decide.
 */
export default async function Revision({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const t = String((await searchParams).t ?? 'comprobantes');
  const [docs, prods] = await Promise.all([comprobantesEnRevision(s.emisorId), productosEnRevision(s.emisorId)]);
  const productos = prods.filter((p) => p.tipo !== 2);
  const servicios = prods.filter((p) => p.tipo === 2);
  const tabs = [
    { k: 'comprobantes', t: 'Comprobantes', n: docs.length },
    { k: 'productos', t: 'Productos', n: productos.length },
    { k: 'servicios', t: 'Servicios', n: servicios.length },
  ];
  const lista = t === 'servicios' ? servicios : productos;
  const ivaAntiguo = lista.filter((p) => p.motivos.some((m) => m.startsWith('IVA antiguo'))).length;
  return (
    <>
      <Cabecera titulo="Revisión" sub="Lo que quedó con algún problema en días anteriores. Nada de aquí se envía al SRI: usted decide qué hacer." />
      <nav className="pestanas" aria-label="Secciones de revisión">
        {tabs.map((x) => (
          <Link key={x.k} href={`/revision?t=${x.k}`} className={t === x.k ? 'on' : ''} aria-current={t === x.k ? 'page' : undefined}>
            {x.t} {x.n > 0 && <span className="contador">{x.n}</span>}
          </Link>
        ))}
      </nav>

      {t === 'comprobantes' ? (
        docs.length === 0 ? <Vacio>No hay comprobantes pendientes de días anteriores.</Vacio> : (
          <>
            <div className="alerta aviso">Regla: un comprobante con fecha anterior a hoy <strong>no se envía al SRI</strong> (si se autoriza con fecha antigua genera multa). «Consultar al SRI» solo pregunta si ya estaba autorizado.</div>
            <div className="card sin-padding">
              {docs.map((d) => {
                const borrador = !d.clave || d.clave.length !== 49;
                return (
                  <div key={`${d.tipo}-${d.id}`} className="fila-revision">
                    <div className="fila">
                      <strong>{d.cliente ?? d.nombre}</strong>
                      {d.total != null && <strong>${money(d.total)}</strong>}
                    </div>
                    <div className="fila muted" style={{ fontSize: 13 }}>
                      <span>{d.nombre} {d.numero || `borrador #${d.id}`} · {fecha(d.fecha)}</span>
                      <Estado id={d.estado} />
                    </div>
                    <AccionesComprobante tipo={d.tipo} id={d.id} ruta={d.ruta} borrador={borrador} tieneClave={!borrador} mensaje={d.mensaje} />
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : (
        lista.length === 0 ? <Vacio>No hay {t === 'servicios' ? 'servicios' : 'productos'} con problemas.</Vacio> : (
          <>
            {ivaAntiguo > 1 && <div className="alerta aviso" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{ivaAntiguo} con IVA antiguo (12 % o 14 %). El SRI rechaza facturas con esas tarifas.</span><CorregirIva todos={ivaAntiguo} />
            </div>}
            <div className="card sin-padding">
              {lista.map((p) => (
                <div key={p.id} className="fila-revision">
                  <div className="fila"><strong>{p.nombre}</strong><span>${money(p.precio)}</span></div>
                  <div className="muted" style={{ fontSize: 13 }}>{p.codigo}</div>
                  <ul className="motivos">{p.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
                  <div className="acciones">
                    <Link className="btn chico" href={`/productos/${p.id}`}>Editar</Link>
                    {p.motivos.some((m) => m.startsWith('IVA antiguo')) && <CorregirIva id={p.id} />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}
    </>
  );
}
