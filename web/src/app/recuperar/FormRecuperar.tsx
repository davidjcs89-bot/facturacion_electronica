'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { solicitarCodigo, cambiarClave, type EstadoRecuperar } from './actions';

export function FormRecuperar() {
  const [s1, pedir, p1] = useActionState<EstadoRecuperar, FormData>(solicitarCodigo, {});
  const [s2, cambiar, p2] = useActionState<EstadoRecuperar, FormData>(cambiarClave, {});
  if (s2.paso === 'listo') {
    return (
      <>
        <div className="alerta ok">{s2.mensaje}</div>
        <Link className="btn primario" href="/login" style={{ width: '100%' }}>Ir a ingresar</Link>
      </>
    );
  }
  if (s1.paso === 'codigo') {
    return (
      <form action={cambiar}>
        <div className="alerta info">{s1.mensaje}</div>
        {s2.mensaje && <div className="alerta error">{s2.mensaje}</div>}
        <input type="hidden" name="correo" value={s1.correo} />
        <div className="campo"><label>Código de seguridad</label><input name="codigo" inputMode="numeric" maxLength={6} required autoFocus /></div>
        <div className="campo"><label>Nueva clave</label><input name="clave" type="password" autoComplete="new-password" required /></div>
        <div className="campo"><label>Confirmar clave</label><input name="confirmacion" type="password" autoComplete="new-password" required /></div>
        <button className="btn primario" style={{ width: '100%', marginTop: 8 }} disabled={p2}>{p2 ? 'Guardando…' : 'Cambiar clave'}</button>
      </form>
    );
  }
  return (
    <form action={pedir}>
      {s1.mensaje && <div className="alerta error">{s1.mensaje}</div>}
      <div className="campo"><label>Correo registrado</label><input name="correo" type="email" required autoFocus /></div>
      <button className="btn primario" style={{ width: '100%', marginTop: 8 }} disabled={p1}>{p1 ? 'Enviando…' : 'Enviar código'}</button>
      <p style={{ textAlign: 'center', marginTop: 14 }}><Link href="/login">Volver a ingresar</Link></p>
    </form>
  );
}
