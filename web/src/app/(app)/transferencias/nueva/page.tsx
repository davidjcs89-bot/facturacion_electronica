import { requerirEmisor } from '@/lib/auth';
import { bodegas } from '@/lib/catalogos';
import { Cabecera, Alerta } from '@/components/ui';
import { FormTransferencia } from '../Formularios';

export default async function NuevaTransferencia() {
  const s = await requerirEmisor();
  const bods = (await bodegas(s.emisorId)).filter((b) => b.activa);
  return (
    <>
      <Cabecera titulo="Nueva transferencia entre bodegas" />
      {bods.length >= 2 ? <FormTransferencia bodegas={bods} /> : <Alerta tipo="aviso">Necesita al menos dos bodegas activas.</Alerta>}
    </>
  );
}
