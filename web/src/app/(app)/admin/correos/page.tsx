import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera } from '@/components/ui';
import { FormCuenta, FormPrueba } from './Formularios';
import { eliminarCuenta } from './actions';
import { BotonBorrar } from '../_comun/BotonBorrar';

export default async function Correos() {
  await requerirAdminSistema();
  const cuentas = await sql<{ id: number; direccion: string; nombre_mostrar: string; servidor: string; puerto: number; ssl: boolean }[]>`
    select id, direccion, nombre_mostrar, servidor, puerto, ssl from cuentas_correo order by id`;
  return (
    <>
      <Cabecera titulo="Cuentas de correo" sub="La primera cuenta de la lista es la que envía los comprobantes de todos los emisores" />
      <div className="card"><FormPrueba /></div>
      {cuentas.map((c, i) => (
        <div key={c.id}>
          {i === 0 && <span className="badge e6" style={{ marginBottom: 6, display: 'inline-block' }}>Cuenta de envío</span>}
          <FormCuenta c={c} />
          <form action={eliminarCuenta} style={{ marginTop: -8, marginBottom: 16 }}><input type="hidden" name="id" value={c.id} /><BotonBorrar chico texto="Eliminar cuenta" /></form>
        </div>
      ))}
      <FormCuenta c={{}} />
    </>
  );
}
