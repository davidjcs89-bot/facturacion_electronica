import { requerirSesion } from '@/lib/auth';
import { sql } from '@/lib/db';
import { Cabecera, Alerta } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { FormEmisor, FormFirma, FormLogo } from './Formularios';

export default async function ConfigEmisor() {
  const s = await requerirSesion();
  const ivas = await sql<{ id: number; descripcion: string }[]>`
    select id, descripcion from porcentaje_impuesto_producto where id_impuesto in (1, 4) and porcentaje > 0 order by porcentaje desc`;
  if (!s.emisorId) {
    return (
      <>
        <Cabecera titulo="Crear emisor" sub="Registre los datos de su empresa para empezar a emitir comprobantes" />
        <FormEmisor emisor={null} ivas={ivas} nuevo />
      </>
    );
  }
  const [e] = await sql`select * from emisor where id = ${s.emisorId}`;
  const [firma] = await sql<{ titular: string; nombre_archivo: string; valido_hasta: Date; fecha_carga: Date }[]>`
    select titular, nombre_archivo, valido_hasta, fecha_carga from firma_emisor where id_emisor = ${s.emisorId}`;
  const [logo] = await sql`select 1 from logo_emisor where id_emisor = ${s.emisorId}`;
  const vence = firma ? Math.ceil((firma.valido_hasta.getTime() - Date.now()) / 86400000) : null;
  return (
    <>
      <Cabecera titulo="Emisor y firma electrónica" sub={`RUC ${e.ruc}`} />
      <FormEmisor emisor={e} ivas={ivas} />
      <div className="grid c2">
        <div className="card">
          <h2>Firma electrónica (.p12)</h2>
          {firma ? (
            <>
              <dl className="datos" style={{ marginBottom: 12 }}>
                <dt>Titular</dt><dd>{firma.titular}</dd>
                <dt>Archivo</dt><dd>{firma.nombre_archivo}</dd>
                <dt>Válida hasta</dt><dd>{fecha(firma.valido_hasta)}</dd>
                <dt>Cargada</dt><dd>{fecha(firma.fecha_carga)}</dd>
              </dl>
              {vence != null && vence < 0 && <Alerta tipo="error">La firma está vencida. Cargue una nueva.</Alerta>}
              {vence != null && vence >= 0 && vence <= 30 && <Alerta tipo="aviso">La firma vence en {vence} días.</Alerta>}
            </>
          ) : (
            <Alerta tipo="aviso">Aún no ha cargado la firma electrónica. Sin ella no se pueden emitir comprobantes.</Alerta>
          )}
          <FormFirma reemplazar={!!firma} />
        </div>
        <div className="card">
          <h2>Logo para el RIDE</h2>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/emisor/logo?t=${Date.now()}`} alt="Logo" style={{ maxWidth: 260, maxHeight: 120, display: 'block', marginBottom: 12 }} />
          ) : <p className="muted">Sin logo: el RIDE mostrará el nombre comercial.</p>}
          <FormLogo tieneLogo={!!logo} />
        </div>
      </div>
    </>
  );
}
