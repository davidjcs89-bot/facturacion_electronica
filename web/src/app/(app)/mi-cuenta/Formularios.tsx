'use client';
import { useActionState } from 'react';
import { guardarMiCuenta, cambiarMiClave } from './actions';
import { Msg, type EstadoForm } from '../admin/_comun/Msg';
import { CamposUbicacion } from '@/components/CamposUbicacion';
import { CampoClave } from '@/components/CampoClave';

type Datos = { nombre: string; apellido: string; direccion_dom_cuenta: string | null; ciudad: string | null; provincia: string | null };

export function FormMisDatos({ u }: { u: Datos }) {
  const [e, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarMiCuenta, {});
  return (
    <form action={accion} className="card">
      <h2>Mis datos</h2>
      <Msg e={e} />
      <div className="form-grid">
        <div className="campo"><label>Nombre *</label><input name="nombre" defaultValue={u.nombre} maxLength={50} required autoComplete="given-name" /></div>
        <div className="campo"><label>Apellido *</label><input name="apellido" defaultValue={u.apellido} maxLength={50} required autoComplete="family-name" /></div>
        <CamposUbicacion provincia={u.provincia} ciudad={u.ciudad} />
        <div className="campo ancho"><label>Dirección *</label><input name="direccion_dom_cuenta" defaultValue={u.direccion_dom_cuenta ?? ''} maxLength={70} required autoComplete="street-address" /></div>
      </div>
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar mis datos'}</button>
      </div>
    </form>
  );
}

export function FormMiClave() {
  const [e, accion, pendiente] = useActionState<EstadoForm, FormData>(cambiarMiClave, {});
  return (
    <form action={accion} className="card" key={e.ok ? 'ok' : 'f'}>
      <h2>Cambiar mi clave</h2>
      <Msg e={e} />
      <div className="form-grid">
        <div className="campo"><label>Clave actual *</label><CampoClave name="actual" required autoComplete="current-password" /></div>
        <div className="campo"><label>Nueva clave *</label><CampoClave name="nueva" required minLength={6} autoComplete="new-password" /></div>
        <div className="campo"><label>Repita la nueva clave *</label><CampoClave name="repetir" required minLength={6} autoComplete="new-password" /></div>
      </div>
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pendiente}>{pendiente ? 'Cambiando…' : 'Cambiar clave'}</button>
      </div>
    </form>
  );
}
