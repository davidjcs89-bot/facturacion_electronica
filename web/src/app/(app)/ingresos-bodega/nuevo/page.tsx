import { requerirEmisor } from '@/lib/auth';
import { bodegas } from '@/lib/catalogos';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { FormIngreso } from '../FormIngreso';

export default async function NuevoIngreso() {
  const s = await requerirEmisor();
  const bods = (await bodegas(s.emisorId)).filter((b) => b.activa);
  return (
    <>
      <Cabecera titulo="Ingreso de existencias" sub="Suma stock a la bodega elegida" />
      {bods.length ? <FormIngreso bodegas={bods} hoy={hoyEcuadorISO()} /> : <Alerta tipo="aviso">Primero cree una bodega activa.</Alerta>}
    </>
  );
}
