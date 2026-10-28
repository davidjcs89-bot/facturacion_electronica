import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { opcionesImpuestos } from '../datos';
import { FormProducto } from '../FormProducto';

export default async function NuevoProducto() {
  const s = await requerirEmisor();
  const op = await opcionesImpuestos();
  const [e] = await sql<{ id_impuesto_iva_actual: number }[]>`select id_impuesto_iva_actual from emisor where id = ${s.emisorId}`;
  return (
    <>
      <Cabecera titulo="Nuevo producto" />
      <FormProducto p={{}} {...op} atributos={[]} ivaPorDefecto={e?.id_impuesto_iva_actual ?? 101} />
    </>
  );
}
