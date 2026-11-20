import { requerirEmisor } from '@/lib/auth';
import { puntosEmision, textoPunto, formasPago } from '@/lib/catalogos';
import { Cabecera, Alerta } from '@/components/ui';
import { vozHabilitada } from '@/lib/voz/habilitada';
import { FacturaVoz } from './FacturaVoz';

export const dynamic = 'force-dynamic';

export default async function FacturaPorVoz() {
  const s = await requerirEmisor();
  if (!vozHabilitada(s.emisorId)) {
    return (
      <>
        <Cabecera titulo="Factura por voz" />
        <Alerta tipo="aviso">La facturación por voz aún no está activada para esta empresa.</Alerta>
      </>
    );
  }
  const [puntos, formas] = await Promise.all([puntosEmision(s.emisorId), formasPago()]);
  if (!puntos.length) {
    return (
      <>
        <Cabecera titulo="Factura por voz" />
        <Alerta tipo="aviso">Primero configure un punto de emisión en Configuración → Puntos de emisión.</Alerta>
      </>
    );
  }
  return (
    <FacturaVoz
      puntos={puntos.map((p) => ({ id: p.id, texto: textoPunto(p), pruebas: p.ambiente === '1' }))}
      formas={formas.map((f) => ({ id: f.id, texto: f.descripcion_form_pago }))}
    />
  );
}
