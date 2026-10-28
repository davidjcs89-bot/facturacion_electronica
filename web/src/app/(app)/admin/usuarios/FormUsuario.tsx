'use client';
import { useActionState } from 'react';
import { guardarUsuario } from './actions';
import { Msg, type EstadoForm } from '../_comun/Msg';

type U = Record<string, string | number | boolean | null | undefined>;
type Op = { id: number; texto: string };

export function FormUsuario({ u, emisores, roles, categorias }: { u: U; emisores: Op[]; roles: Op[]; categorias: Op[] }) {
  const [e, accion, pend] = useActionState<EstadoForm, FormData>(guardarUsuario, {});
  const v = (k: string) => (u[k] as string | number | undefined) ?? '';
  return (
    <form action={accion} className="card">
      <Msg e={e} />
      {u.id && <input type="hidden" name="id" value={String(u.id)} />}
      <div className="form-grid">
        <div className="campo"><label>Usuario *</label><input name="nombre_usuario" defaultValue={v('nombre_usuario')} maxLength={15} required autoComplete="off" /></div>
        <div className="campo"><label>{u.id ? 'Nueva clave (dejar vacío para no cambiar)' : 'Clave *'}</label><input name="clave" type="password" autoComplete="new-password" required={!u.id} /></div>
        <div className="campo"><label>Nombre *</label><input name="nombre" defaultValue={v('nombre')} maxLength={50} required /></div>
        <div className="campo"><label>Apellido *</label><input name="apellido" defaultValue={v('apellido')} maxLength={50} required /></div>
        <div className="campo"><label>Correo *</label><input name="correo" type="email" defaultValue={String(v('correo')).toLowerCase()} maxLength={50} required /></div>
        <div className="campo"><label>Teléfono *</label><input name="numero_telefono" defaultValue={v('numero_telefono')} maxLength={15} required /></div>
        <div className="campo"><label>Dirección *</label><input name="direccion_dom_cuenta" defaultValue={v('direccion_dom_cuenta')} maxLength={70} required /></div>
        <div className="campo"><label>Ciudad *</label><input name="ciudad" defaultValue={v('ciudad')} maxLength={15} required /></div>
        <div className="campo"><label>Provincia *</label><input name="provincia" defaultValue={v('provincia')} maxLength={15} required /></div>
        <div className="campo"><label>Rol</label><select name="id_rol" defaultValue={v('id_rol') || 2}>{roles.map((r) => <option key={r.id} value={r.id}>{r.texto}</option>)}</select></div>
        <div className="campo"><label>Categoría</label><select name="id_categoria" defaultValue={v('id_categoria') || 4}>{categorias.map((r) => <option key={r.id} value={r.id}>{r.texto}</option>)}</select></div>
        <div className="campo"><label>Estado</label>
          <select name="estado" defaultValue={v('estado') || 1}><option value={1}>Activo</option><option value={2}>Inactivo</option><option value={3}>Eliminado</option></select>
        </div>
        <div className="campo ancho"><label>Emisor</label>
          <select name="id_emisor" defaultValue={v('id_emisor')}><option value="">— Sin emisor (lo creará al ingresar) —</option>{emisores.map((x) => <option key={x.id} value={x.id}>{x.texto}</option>)}</select>
        </div>
        <div className="campo check"><input type="checkbox" id="notif" name="notificaciones" defaultChecked={!!u.notificaciones} /><label htmlFor="notif">Recibir notificaciones</label></div>
      </div>
      <div className="acciones" style={{ marginTop: 14 }}><button className="btn primario" disabled={pend}>{pend ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  );
}
