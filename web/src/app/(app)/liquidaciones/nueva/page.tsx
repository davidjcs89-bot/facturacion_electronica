import { requerirEmisor } from '@/lib/auth';
import { puntosEmision } from '@/lib/catalogos';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { FormNuevaLiquidacion } from './FormNuevaLiquidacion';

export default async function NuevaLiquidacion() {
  const s = await requerirEmisor();
  const puntos = await puntosEmision(s.emisorId);
  return (
    <>
      <Cabecera titulo="Nueva liquidación de compra" sub="Paso 1: datos generales. Luego agregará productos (precio sin IVA) y formas de pago." />
      {puntos.length === 0 ? (
        <Alerta tipo="aviso">Primero configure un punto de emisión en Configuración → Puntos de emisión.</Alerta>
      ) : (
        <FormNuevaLiquidacion puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))} hoy={hoyEcuadorISO()} />
      )}
    </>
  );
}
