import { requerirEmisor } from '@/lib/auth';
import { bodegas } from '@/lib/catalogos';
import { Cabecera, Alerta } from '@/components/ui';
import { ImportarXml } from '../Formularios';

export default async function Importar() {
  const s = await requerirEmisor();
  const bods = (await bodegas(s.emisorId)).filter((b) => b.activa);
  return (
    <>
      <Cabecera titulo="Importar compra desde XML" sub="Registra la compra, crea el proveedor y los productos que no existan y suma el stock" />
      {bods.length ? <ImportarXml bodegas={bods} /> : <Alerta tipo="aviso">Primero cree una bodega activa.</Alerta>}
    </>
  );
}
