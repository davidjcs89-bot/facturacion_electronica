import 'server-only';
import { sql } from '../db';
import { emisionPermitida } from './procesar';

/** Informacion del documento electronico asociado y si se puede emitir */
export async function estadoElectronico(tipoDoc: number, id: number, emisorId: number) {
  const [d] = await sql<{ mensajes: string | null; tiene_aut: boolean; tiene_firmado: boolean; fecha_modificacion: Date }[]>`
    select mensajes, xml_retornado is not null tiene_aut, xml_firmado is not null tiene_firmado, fecha_modificacion
    from documentos_electronicos where id_tipo_comprobante = ${tipoDoc} and id_comprobante = ${id}
    order by id desc limit 1`;
  const perm = await emisionPermitida(emisorId);
  return {
    mensajes: d?.mensajes ?? null,
    tieneXmlAutorizado: !!d?.tiene_aut,
    tieneXmlFirmado: !!d?.tiene_firmado,
    emisionPermitida: perm.permitido,
    motivoBloqueo: perm.motivo,
  };
}
