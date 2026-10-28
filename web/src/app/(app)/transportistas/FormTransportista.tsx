'use client';
import { useActionState } from 'react';
import { guardarTransportista } from './actions';
import { Msg, type EstadoForm } from '../admin/_comun/Msg';

type T = { id?: number; nombre?: string; tipo_identificacion?: number; numero_identificacion?: string; placa?: string; correo?: string | null };

export function FormTransportista({ t, tipos }: { t: T; tipos: { id: number; descripcion: string }[] }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarTransportista, {});
  return (
    <form action={accion} className="card">
      <Msg e={e} />
      {t.id && <input type="hidden" name="id" value={t.id} />}
      <div className="form-grid">
        <div className="campo ancho"><label>Nombre o razón social *</label><input name="nombre" defaultValue={t.nombre} required maxLength={50} /></div>
        <div className="campo"><label>Tipo de identificación *</label>
          <select name="tipo_identificacion" defaultValue={t.tipo_identificacion ?? 2}>{tipos.map((x) => <option key={x.id} value={x.id}>{x.descripcion}</option>)}</select>
        </div>
        <div className="campo"><label>Identificación *</label><input name="numero_identificacion" defaultValue={t.numero_identificacion} required maxLength={13} /></div>
        <div className="campo"><label>Placa *</label><input name="placa" defaultValue={t.placa} required maxLength={10} /></div>
        <div className="campo"><label>Correo</label><input name="correo" type="email" defaultValue={t.correo ?? ''} maxLength={50} /></div>
      </div>
      <div className="acciones" style={{ marginTop: 16 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
