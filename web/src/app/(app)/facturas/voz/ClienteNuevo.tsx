'use client';
import { useState } from 'react';
import { cedulaValida, rucValido, emailValido } from '@/lib/validaciones';

export type DatosClienteNuevo = { nombre: string; identificacion: string; correo: string | null };

/** Formulario corto para crear el cliente desde la factura por voz (se guarda al emitir) */
export function ClienteNuevo({ inicial, onListo, onCancelar }: {
  inicial?: Partial<DatosClienteNuevo>;
  onListo: (d: DatosClienteNuevo) => void;
  onCancelar: () => void;
}) {
  const [ident, setIdent] = useState(inicial?.identificacion ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [correo, setCorreo] = useState(inicial?.correo ?? '');
  const [error, setError] = useState<string | null>(null);

  const limpio = ident.replace(/\D/g, '');
  const tipo = limpio.length === 13 ? 'RUC' : limpio.length === 10 ? 'Cédula' : null;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (limpio.length === 10 && !cedulaValida(limpio)) return setError('La cédula no es válida. Revise los números.');
    if (limpio.length === 13 && !rucValido(limpio)) return setError('El RUC no es válido: debe terminar en 001 o similar.');
    if (limpio.length !== 10 && limpio.length !== 13) return setError('Escriba la cédula (10 dígitos) o el RUC (13 dígitos).');
    if (nombre.trim().length < 3) return setError('Escriba el nombre o la razón social.');
    if (correo.trim() && !emailValido(correo.trim())) return setError('El correo no es válido.');
    onListo({ identificacion: limpio, nombre: nombre.trim().toUpperCase(), correo: correo.trim() ? correo.trim().toUpperCase() : null });
  }

  return (
    <form onSubmit={guardar} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <strong>Cliente nuevo</strong>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Cédula o RUC {tipo && <strong style={{ color: 'var(--primary)' }}>· {tipo}</strong>}</span>
        <input inputMode="numeric" autoComplete="off" value={ident} onChange={(e) => { setIdent(e.target.value); setError(null); }} placeholder="10 o 13 dígitos" maxLength={13} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Nombre o razón social</span>
        <input autoComplete="off" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(null); }} placeholder="Como consta en la cédula o el RUC" />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Correo (para enviarle la factura)</span>
        <input type="email" inputMode="email" autoComplete="off" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(null); }} placeholder="Opcional" />
      </label>
      {error && <span role="alert" style={{ color: 'var(--danger, #b42318)', fontSize: 14 }}>{error}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>
        <button className="btn primario" style={{ flexGrow: 1 }}>Usar este cliente</button>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Se guarda en Clientes al emitir la factura.</span>
    </form>
  );
}
