import { requerirEmisor } from '@/lib/auth';
import { puntosEmision } from '@/lib/catalogos';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { FormNuevaRetencion } from './FormNuevaRetencion';

export default async function NuevaRetencion() {
  const s = await requerirEmisor();
  const puntos = await puntosEmision(s.emisorId);
  return (
    <>
      <Cabecera titulo="Nuevo comprobante de retención" sub="Paso 1: datos generales. Luego agregará los impuestos retenidos." />
      {puntos.length === 0 ? (
        <Alerta tipo="aviso">Primero configure un punto de emisión en Configuración → Puntos de emisión.</Alerta>
      ) : (
        <FormNuevaRetencion puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))} hoy={hoyEcuadorISO()} />
      )}
    </>
  );
}
