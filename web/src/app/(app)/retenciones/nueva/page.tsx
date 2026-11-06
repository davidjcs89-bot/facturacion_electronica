import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { puntosEmision } from '@/lib/catalogos';
import { hoyEcuadorISO, fecha, money } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { FormNuevaRetencion } from './FormNuevaRetencion';
import { DesdeFacturaProveedor, CopiarRetencion } from './Importar';

export default async function NuevaRetencion() {
  const s = await requerirEmisor();
  const puntos = await puntosEmision(s.emisorId);
  const recientes = await sql<{ id: number; numero: string; fecha_emision: Date; nombre: string | null; total: number }[]>`
    select r.id, r.numero, r.fecha_emision, c.nombre_cliente nombre,
           coalesce((select sum(d.valor_retenido) from detalle_retencion d where d.id_retencion = r.id), 0) total
    from retencion r left join clientes c on c.id = r.id_cliente
    where r.id_emisor = ${s.emisorId}
    order by r.id desc limit 40`;
  const opcionesPuntos = puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }));
  return (
    <>
      <Cabecera titulo="Nuevo comprobante de retención" sub="Elija cómo empezar: desde la factura del proveedor, copiando otra retención o desde cero." />
      {puntos.length === 0 ? (
        <Alerta tipo="aviso">Primero configure un punto de emisión en Configuración → Puntos de emisión.</Alerta>
      ) : (
        <>
          <div className="grid c2" style={{ marginBottom: 16 }}>
            <DesdeFacturaProveedor puntos={opcionesPuntos} />
            <CopiarRetencion recientes={recientes.map((r) => ({
              id: r.id,
              texto: `${r.numero || `Borrador #${r.id}`} · ${r.nombre ?? 'sin sujeto'} · ${fecha(r.fecha_emision)} · $${money(Number(r.total))}`,
            }))} />
          </div>
          <h2 style={{ margin: '8px 0' }}>O desde cero</h2>
          <FormNuevaRetencion puntos={opcionesPuntos} hoy={hoyEcuadorISO()} />
        </>
      )}
    </>
  );
}
