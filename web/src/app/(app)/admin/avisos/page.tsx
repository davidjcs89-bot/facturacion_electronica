import { requerirAdminSistema } from '@/lib/auth';
import { sql } from '@/lib/db';
import { fechaHora } from '@/lib/formato';
import { Cabecera, Vacio } from '@/components/ui';
import { FormAviso } from './FormAviso';
import { eliminarAviso } from './actions';
import { BotonBorrar } from '../_comun/BotonBorrar';

export default async function Avisos() {
  await requerirAdminSistema();
  const avisos = await sql<{ id: number; message: string; createon: Date }[]>`select id, message, createon from avisos order by createon desc`;
  return (
    <>
      <Cabecera titulo="Avisos" sub="Los 5 más recientes aparecen en la página de inicio" />
      <div className="card"><FormAviso /></div>
      <div className="card">
        {avisos.length === 0 ? <Vacio>No hay avisos.</Vacio> : avisos.map((a) => (
          <div key={a.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
            <div className="acciones" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: '0.82rem' }}>{fechaHora(a.createon)}</span>
              <form action={eliminarAviso}><input type="hidden" name="id" value={a.id} /><BotonBorrar chico pregunta="¿Eliminar este aviso?" /></form>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', margin: '4px 0 6px' }}>{a.message}</div>
            <FormAviso id={a.id} texto={a.message} />
          </div>
        ))}
      </div>
    </>
  );
}
