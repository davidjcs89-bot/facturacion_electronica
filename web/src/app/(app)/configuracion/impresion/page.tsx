import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { FormImpresion } from './FormImpresion';
import { FormFormato } from './FormFormato';
import { configImpresion, FORMATOS, ACCIONES } from '@/lib/impresion';

export default async function ConfigImpresion() {
  const s = await requerirEmisor();
  const filas = await sql<{ id: number; descripcion_doc: string; firma: boolean | null; mensajes: string | null }[]>`
    select t.id, t.descripcion_doc, i.firma, i.mensajes
    from tipo_documento t left join impresion_comprobantes i on i.id_comprobante = t.id and i.id_emisor = ${s.emisorId}
    order by t.id`;
  const cfg = await configImpresion(s.emisorId);
  return (
    <>
      <Cabecera titulo="Impresión" sub="Formato (hoja A4 o ticket), qué hacer al emitir, y la línea de firma y el mensaje al pie de cada comprobante" />
      <FormFormato formato={cfg.formato} alEmitir={cfg.alEmitir} formatos={Object.entries(FORMATOS)} acciones={Object.entries(ACCIONES)} />
      <div className="grid c2">
        {filas.map((f) => (
          <FormImpresion key={f.id} tipo={f.id} nombre={f.descripcion_doc} firma={!!f.firma} mensajes={f.mensajes} />
        ))}
      </div>
    </>
  );
}
