'use client';
import { useActionState } from 'react';
import { guardarEmisor, crearEmisor, subirFirma, subirLogo, quitarLogo, type Estado } from './actions';

function Msg({ e }: { e: Estado }) {
  return e.mensaje ? <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div> : null;
}

type Emisor = Record<string, unknown> | null;

export function FormEmisor({ emisor, ivas, nuevo }: { emisor: Emisor; ivas: { id: number; descripcion: string }[]; nuevo?: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(nuevo ? crearEmisor : guardarEmisor, {});
  const v = (k: string) => (emisor?.[k] as string | number | null | undefined) ?? '';
  const b = (k: string) => Boolean(emisor?.[k]);
  return (
    <form action={accion} className="card">
      <Msg e={e} />
      <div className="form-grid">
        <div className="campo"><label>RUC *</label><input name="ruc" defaultValue={v('ruc')} maxLength={13} required /></div>
        <div className="campo"><label>Razón social *</label><input name="razon_social" defaultValue={v('razon_social')} maxLength={40} required /></div>
        <div className="campo"><label>Nombre comercial *</label><input name="nombre_comercial" defaultValue={v('nombre_comercial')} maxLength={40} required /></div>
        <div className="campo ancho"><label>Dirección matriz *</label><input name="direccion_matriz" defaultValue={v('direccion_matriz')} maxLength={100} required /></div>
        <div className="campo"><label>Ambiente SRI</label>
          <select name="tipo_ambiente" defaultValue={v('tipo_ambiente') || 1}><option value={1}>Pruebas</option><option value={2}>Producción</option></select>
        </div>
        <div className="campo"><label>IVA vigente</label>
          <select name="id_impuesto_iva_actual" defaultValue={v('id_impuesto_iva_actual') || 101}>{ivas.map((i) => <option key={i.id} value={i.id}>{i.descripcion}</option>)}</select>
        </div>
        <div className="campo"><label>N.º contribuyente especial</label><input name="numero_con_especial" defaultValue={v('numero_con_especial')} maxLength={13} /></div>
        <div className="campo check"><input type="checkbox" id="oc" name="obligado_conta" defaultChecked={b('obligado_conta')} /><label htmlFor="oc">Obligado a llevar contabilidad</label></div>
        <div className="campo check"><input type="checkbox" id="ce" name="cintirbuyente_especial" defaultChecked={b('cintirbuyente_especial')} /><label htmlFor="ce">Contribuyente especial</label></div>
        <div className="campo check"><input type="checkbox" id="ci" name="control_inventario" defaultChecked={b('control_inventario')} /><label htmlFor="ci">Control de inventario</label></div>
        <div className="campo ancho"><label>Texto adicional en comprobantes</label><textarea name="adicionales_comprobantes" defaultValue={v('adicionales_comprobantes') as string} rows={2} /></div>
      </div>
      <div className="acciones" style={{ marginTop: 14 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : nuevo ? 'Crear emisor' : 'Guardar'}</button></div>
    </form>
  );
}

export function FormFirma({ reemplazar }: { reemplazar: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(subirFirma, {});
  return (
    <form action={accion}>
      <Msg e={e} />
      <div className="form-grid">
        <div className="campo"><label>Archivo .p12 / .pfx</label><input type="file" name="archivo" accept=".p12,.pfx" required /></div>
        <div className="campo"><label>Clave de la firma</label><input type="password" name="clave" autoComplete="new-password" required /></div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>La clave se guarda cifrada y solo se usa para firmar sus comprobantes.</p>
      <button className="btn primario" disabled={pend}>{pend ? 'Verificando…' : reemplazar ? 'Reemplazar firma' : 'Cargar firma'}</button>
    </form>
  );
}

export function FormLogo({ tieneLogo }: { tieneLogo: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(subirLogo, {});
  return (
    <>
      <form action={accion}>
        <Msg e={e} />
        <div className="campo"><label>Imagen PNG o JPG (máx. 400 KB)</label><input type="file" name="logo" accept="image/png,image/jpeg" required /></div>
        <div className="acciones" style={{ marginTop: 10 }}><button className="btn" disabled={pend}>{pend ? 'Subiendo…' : 'Subir logo'}</button></div>
      </form>
      {tieneLogo && <form action={quitarLogo} style={{ marginTop: 8 }}><button className="btn peligro chico">Quitar logo</button></form>}
    </>
  );
}
