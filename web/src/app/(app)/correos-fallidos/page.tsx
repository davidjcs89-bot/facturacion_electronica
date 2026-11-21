import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { Cabecera, Vacio } from '@/components/ui';
import { fechaHora } from '@/lib/formato';
import { correosFallidos } from '@/lib/tablero';
import { manejador } from '@/lib/comprobantes/registro';

export default async function CorreosFallidos() {
  const s = await requerirEmisor();
  const filas = await correosFallidos(s.emisorId);
  return (
    <>
      <Cabecera titulo="Correos que fallaron" sub="Últimos 7 días. Abra el comprobante para revisar el correo del cliente y reenviarlo.">
        <Link href="/" className="btn">Volver</Link>
      </Cabecera>
      <div className="card sin-padding">
        {filas.length === 0 ? <Vacio>No hay correos fallidos en los últimos 7 días.</Vacio> : (
          <div className="tabla-wrap">
            <table className="tabla tarjetas">
              <thead><tr><th>Comprobante</th><th>Fecha</th><th>Correo</th><th>Error</th></tr></thead>
              <tbody>
                {filas.map((f) => {
                  const m = manejador(f.tipo);
                  return (
                    <tr key={`${f.tipo}-${f.id}`}>
                      <td data-r="titulo"><Link className="abrir" href={`${m.ruta}/${f.id}`}>{m.nombre} #{f.id}</Link></td>
                      <td className="nowrap" data-r="sub2">{fechaHora(f.fecha)}</td>
                      <td data-r="sub">{f.destino || '—'}</td>
                      <td data-r="extra" className="muted">{f.error}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
