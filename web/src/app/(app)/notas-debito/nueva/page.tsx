import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { puntosEmision } from '@/lib/catalogos';
import { leerParams, type SP } from '@/lib/params';
import { hoyEcuadorISO, money, fecha } from '@/lib/formato';
import { Cabecera, Alerta, Vacio } from '@/components/ui';
import { ESTADO } from '@/lib/constantes';
import { tarifasIva } from '../ivas';
import { FormNuevaND } from './FormNuevaND';

export default async function NuevaNotaDebito({ searchParams }: { searchParams: SP }) {
  const s = await requerirEmisor();
  const p = await leerParams(searchParams);
  const idFactura = Number(p.factura) || 0;

  if (!idFactura) {
    const q = (p.q ?? '').trim();
    const facturas = q
      ? await sql<{ id: number; numero: string; fecha_emision: Date; cliente: string; total: number }[]>`
          select f.id, f.numero, f.fecha_emision, c.nombre_cliente cliente, f.total
          from factura f join clientes c on c.id = f.id_cliente
          where f.id_emisor = ${s.emisorId} and f.estado = ${ESTADO.AUTORIZADO}
            and (f.numero like ${'%' + q + '%'} or c.nombre_cliente ilike ${'%' + q + '%'} or c.identificacion like ${q + '%'})
          order by f.fecha_emision desc limit 25`
      : [];
    return (
      <>
        <Cabecera titulo="Nueva nota de débito" sub="Paso 1: elija la factura autorizada que se modifica" />
        <form className="filtros">
          <div className="campo busqueda"><label>Buscar factura</label><input name="q" defaultValue={q} placeholder="Número de factura, cliente o identificación" autoFocus /></div>
          <button className="btn">Buscar</button>
        </form>
        {q && (
          <div className="card sin-padding">
            {facturas.length === 0 ? <Vacio>No hay facturas autorizadas con ese criterio.</Vacio> : (
              <div className="tabla-wrap">
                <table className="tabla">
                  <thead><tr><th>Factura</th><th>Fecha</th><th>Cliente</th><th className="num">Total</th><th></th></tr></thead>
                  <tbody>
                    {facturas.map((f) => (
                      <tr key={f.id}>
                        <td className="nowrap">{f.numero}</td>
                        <td className="nowrap">{fecha(f.fecha_emision)}</td>
                        <td>{f.cliente}</td>
                        <td className="num">{money(f.total)}</td>
                        <td><Link className="btn chico primario" href={`/notas-debito/nueva?factura=${f.id}`}>Elegir</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  const [f] = await sql<{ id: number; numero: string; fecha_emision: Date; estado: number; total: number; id_punto_emison: number; cliente: string; identificacion: string }[]>`
    select f.id, f.numero, f.fecha_emision, f.estado, f.total, f.id_punto_emison, c.nombre_cliente cliente, c.identificacion
    from factura f join clientes c on c.id = f.id_cliente
    where f.id = ${idFactura} and f.id_emisor = ${s.emisorId}`;
  if (!f) return <><Cabecera titulo="Nueva nota de débito" /><Alerta tipo="error">Factura no encontrada.</Alerta></>;
  if (f.estado !== ESTADO.AUTORIZADO) {
    return <><Cabecera titulo="Nueva nota de débito" /><Alerta tipo="error">La factura {f.numero} no está autorizada; solo se emiten notas de débito sobre facturas autorizadas.</Alerta></>;
  }
  const [puntos, ivas, [e]] = await Promise.all([
    puntosEmision(s.emisorId),
    tarifasIva(),
    sql<{ id_impuesto_iva_actual: number }[]>`select id_impuesto_iva_actual from emisor where id = ${s.emisorId}`,
  ]);
  return (
    <>
      <Cabecera titulo="Nueva nota de débito" sub={<>Factura {f.numero} · {f.cliente} ({f.identificacion}) · {fecha(f.fecha_emision)} · Total ${money(f.total)}</>}>
        <Link className="btn" href="/notas-debito/nueva">Cambiar factura</Link>
      </Cabecera>
      <FormNuevaND idFactura={f.id} hoy={hoyEcuadorISO()} puntoDefecto={f.id_punto_emison} ivaDefecto={e.id_impuesto_iva_actual}
        puntos={puntos.map((x) => ({ id: x.id, texto: `${x.numero_establecimiento}-${x.numero_emision} · ${x.direccion}` }))}
        ivas={ivas.map((i) => ({ id: i.id, texto: i.descripcion }))} />
    </>
  );
}
