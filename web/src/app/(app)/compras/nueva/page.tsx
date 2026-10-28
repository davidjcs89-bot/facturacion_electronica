import { requerirEmisor } from '@/lib/auth';
import { bodegas } from '@/lib/catalogos';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { CompraManual } from '../Formularios';

export default async function NuevaCompra() {
  const s = await requerirEmisor();
  const bods = (await bodegas(s.emisorId)).filter((b) => b.activa);
  return (
    <>
      <Cabecera titulo="Registrar compra" sub="Para facturas sin XML. Suma el stock y actualiza el costo de los productos." />
      {bods.length ? <CompraManual bodegas={bods} hoy={hoyEcuadorISO()} /> : <Alerta tipo="aviso">Primero cree una bodega activa.</Alerta>}
    </>
  );
}
