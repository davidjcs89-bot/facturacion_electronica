import Link from 'next/link';
import { Fragment } from 'react';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Vacio } from '@/components/ui';

export default async function PuntosEmision() {
  const s = await requerirEmisor();
  const puntos = await sql<{ id: number; numero_establecimiento: string; numero_emision: string; direccion: string; bodega: string | null }[]>`
    select p.id, p.numero_establecimiento, p.numero_emision, p.direccion, b.nombre bodega
    from puntos_emisior p left join bodegas b on b.id = p.id_bodega
    where p.id_emisor = ${s.emisorId} order by p.numero_establecimiento, p.numero_emision`;
  const secs = await sql<{ id_punto_emision: number; id_documentos: number; secuencial: number }[]>`
    select s.id_punto_emision, s.id_documentos, s.secuencial from secuencias s
    join puntos_emisior p on p.id = s.id_punto_emision where p.id_emisor = ${s.emisorId}`;
  const tipos = await sql<{ id: number; descripcion_doc: string; codigo_doc: string }[]>`select id, descripcion_doc, codigo_doc from tipo_documento order by id`;
  const sec = (p: number, t: number) => secs.find((x) => x.id_punto_emision === p && x.id_documentos === t)?.secuencial;
  return (
    <>
      <Cabecera titulo="Puntos de emisión" sub="Establecimientos, puntos de emisión y el próximo secuencial de cada comprobante">
        <Link href="/configuracion/puntos-emision/nuevo" className="btn primario">+ Nuevo punto</Link>
      </Cabecera>
      <div className="card sin-padding">
        {puntos.length === 0 ? <Vacio>Aún no hay puntos de emisión. Cree el primero para poder emitir.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr><th>Serie</th><th>Dirección</th><th>Bodega</th>{tipos.map((t) => <th key={t.id} className="num" title={t.descripcion_doc}>{t.codigo_doc}</th>)}</tr>
              </thead>
              <tbody>
                {puntos.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="nowrap"><Link href={`/configuracion/puntos-emision/${p.id}`}>{p.numero_establecimiento}-{p.numero_emision}</Link></td>
                      <td>{p.direccion}</td>
                      <td>{p.bodega}</td>
                      {tipos.map((t) => <td key={t.id} className="num">{sec(p.id, t.id) ?? '—'}</td>)}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Códigos: {tipos.map((t) => `${t.codigo_doc} ${t.descripcion_doc}`).join(' · ')}. El número indica el próximo secuencial que se usará.
      </p>
    </>
  );
}
