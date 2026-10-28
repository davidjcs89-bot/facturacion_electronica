import { requerirEmisor } from '@/lib/auth';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera } from '@/components/ui';
import { FormCabecera } from '../FormCabecera';
import { crearProforma } from '../actions';

export default async function NuevaProforma() {
  await requerirEmisor();
  return (
    <>
      <Cabecera titulo="Nueva proforma" />
      <FormCabecera accion={crearProforma} valores={{ fecha: hoyEcuadorISO(), observaciones: '', cliente: null }} boton="Continuar" />
    </>
  );
}
