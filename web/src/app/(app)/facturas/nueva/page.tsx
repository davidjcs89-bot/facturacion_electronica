import { requerirEmisor } from '@/lib/auth';
import { puntosEmision, textoPunto } from '@/lib/catalogos';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { FormNuevaFactura } from './FormNuevaFactura';

export default async function NuevaFactura() {
  const s = await requerirEmisor();
  const puntos = await puntosEmision(s.emisorId);
  return (
    <>
      <Cabecera titulo="Nueva factura" sub="Paso 1 de 2: elija el cliente. En el siguiente paso agregará productos y la forma de pago." />
      {puntos.length === 0 ? (
        <Alerta tipo="aviso">Primero configure un punto de emisión en Configuración → Puntos de emisión.</Alerta>
      ) : (
        <FormNuevaFactura puntos={puntos.map((p) => ({ id: p.id, texto: textoPunto(p) }))} hoy={hoyEcuadorISO()} />
      )}
    </>
  );
}
