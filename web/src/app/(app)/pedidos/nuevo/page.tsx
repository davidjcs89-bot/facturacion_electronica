import { requerirEmisor } from '@/lib/auth';
import { puntosEmision } from '@/lib/catalogos';
import { Cabecera, Alerta } from '@/components/ui';
import { FormPedido } from '../Formularios';
import { crearPedido } from '../actions';

export default async function NuevoPedido() {
  const s = await requerirEmisor();
  const puntos = await puntosEmision(s.emisorId);
  return (
    <>
      <Cabecera titulo="Nuevo pedido" />
      {puntos.length === 0 ? <Alerta tipo="aviso">Configure primero un punto de emisión.</Alerta> : (
        <FormPedido accion={crearPedido} boton="Continuar" puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))} valores={{ punto: null, cliente: null }} />
      )}
    </>
  );
}
