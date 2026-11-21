'use client';
import { useState } from 'react';

/** Campo de clave con el botón del ojo para mostrarla u ocultarla */
export function CampoClave(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [ver, setVer] = useState(false);
  return (
    <span className="campo-clave">
      <input {...props} type={ver ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar la clave' : 'Mostrar la clave'} aria-pressed={ver} title={ver ? 'Ocultar' : 'Mostrar'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </span>
  );
}
