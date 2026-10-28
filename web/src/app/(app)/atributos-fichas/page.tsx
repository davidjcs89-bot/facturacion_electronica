import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Vacio } from '@/components/ui';
import { FormAtributo } from './Formularios';
import { eliminarAtributo } from './actions';
import { BotonBorrar } from '../admin/_comun/BotonBorrar';

export default async function AtributosFichas() {
  const s = await requerirEmisor();
  const filas = await sql<{ id: number; nombre: string; usos: number }[]>`
    select a.id, a.nombre, (select count(*) from fichas_clientes f where f.id_atributo = a.id) usos
    from atributos_fichas_clientes a where a.id_emisor = ${s.emisorId} order by a.nombre`;
  return (
    <>
      <Cabecera titulo="Atributos de fichas de clientes" sub="Campos personalizados que se llenan en la ficha de cada cliente" />
      <div className="card"><FormAtributo /></div>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>Aún no hay atributos.</Vacio> : (
          <table className="tabla">
            <thead><tr><th>Atributo</th><th className="num">Clientes con valor</th><th></th></tr></thead>
            <tbody>
              {filas.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  <td className="num">{a.usos}</td>
                  <td className="nowrap derecha">
                    <div className="acciones" style={{ justifyContent: 'flex-end' }}>
                      <FormAtributo id={a.id} nombre={a.nombre} />
                      <form action={eliminarAtributo}><input type="hidden" name="id" value={a.id} />
                        <BotonBorrar chico pregunta={`¿Eliminar el atributo ${a.nombre}? Se borrarán también sus valores en las fichas.`} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
