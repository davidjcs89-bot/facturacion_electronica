'use client';
import { useActionState, useState } from 'react';
import { guardarCorreoEmisor, probarCorreoEmisor, type Estado } from './actions';

function Msg({ e }: { e: Estado }) {
  return e.mensaje ? <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div> : null;
}

type Cuenta = { direccion: string; servidor: string; puerto: number; seguridad: string; usuario: string; copia_a: string | null } | null;

const PROVEEDORES: Record<string, { servidor: string; puerto: number; seguridad: string }> = {
  gmail: { servidor: 'smtp.gmail.com', puerto: 465, seguridad: 'SSL' },
  outlook: { servidor: 'smtp.office365.com', puerto: 587, seguridad: 'STARTTLS' },
};

export function FormCorreoEmisor({ c }: { c: Cuenta }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(guardarCorreoEmisor, {});
  const [servidor, setServidor] = useState(c?.servidor ?? '');
  const [puerto, setPuerto] = useState(String(c?.puerto ?? 465));
  const [seguridad, setSeguridad] = useState(c?.seguridad ?? 'SSL');
  const usar = (k: string) => {
    const p = PROVEEDORES[k];
    if (!p) return;
    setServidor(p.servidor); setPuerto(String(p.puerto)); setSeguridad(p.seguridad);
  };
  return (
    <form action={accion} className="card">
      <h3>Cuenta de envío</h3>
      <Msg e={e} />
      <div className="acciones" style={{ marginBottom: 10 }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>Rellenar con:</span>
        <button type="button" className="btn" onClick={() => usar('gmail')}>Gmail</button>
        <button type="button" className="btn" onClick={() => usar('outlook')}>Outlook / Microsoft 365</button>
      </div>
      <div className="form-grid">
        <div className="campo"><label>Correo remitente *</label><input name="direccion" type="email" defaultValue={c?.direccion} maxLength={254} required /></div>
        <div className="campo"><label>Usuario (vacío = el mismo correo)</label><input name="usuario" defaultValue={c && c.usuario !== c.direccion ? c.usuario : ''} maxLength={254} /></div>
        <div className="campo"><label>{c ? 'Nueva clave (vacío = sin cambio)' : 'Clave o contraseña de aplicación *'}</label><input name="clave" type="password" autoComplete="new-password" required={!c} /></div>
        <div className="campo"><label>Servidor SMTP *</label><input name="servidor" value={servidor} onChange={(x) => setServidor(x.target.value)} placeholder="smtp.gmail.com" maxLength={253} required /></div>
        <div className="campo"><label>Puerto *</label>
          <select name="puerto" value={puerto} onChange={(x) => setPuerto(x.target.value)}>
            <option value="465">465</option><option value="587">587</option><option value="25">25</option><option value="2525">2525</option>
          </select>
        </div>
        <div className="campo"><label>Seguridad *</label>
          <select name="seguridad" value={seguridad} onChange={(x) => setSeguridad(x.target.value)}>
            <option value="SSL">SSL / TLS</option><option value="STARTTLS">STARTTLS</option>
          </select>
        </div>
        <div className="campo"><label>Copia oculta a (opcional)</label><input name="copia_a" type="email" defaultValue={c?.copia_a ?? ''} maxLength={254} /></div>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Gmail y Outlook no aceptan la clave normal: cree una «contraseña de aplicación» en la seguridad de su cuenta
        (requiere verificación en dos pasos) y péguela aquí. Al guardar se prueba la conexión.
      </p>
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn primario" disabled={pend}>{pend ? 'Probando conexión…' : 'Guardar'}</button></div>
    </form>
  );
}

export function FormPruebaEmisor({ sugerido }: { sugerido: string }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(probarCorreoEmisor, {});
  return (
    <form action={accion} className="filtros">
      <div className="campo busqueda"><label>Enviar correo de prueba a</label><input name="destino" type="email" defaultValue={sugerido} required /></div>
      <button className="btn" disabled={pend}>{pend ? 'Enviando…' : 'Enviar prueba'}</button>
      <Msg e={e} />
    </form>
  );
}
