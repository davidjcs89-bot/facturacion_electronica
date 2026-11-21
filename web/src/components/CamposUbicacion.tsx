'use client';
import { useEffect, useRef, useState } from 'react';
import { PROVINCIAS, cantonesDe } from '@/lib/ubicacion';
import { provinciaDeIdentificacion } from '@/lib/validaciones';

/**
 * Provincia y ciudad (cantón) del cliente. Al escribir la cédula o RUC en el mismo formulario,
 * la provincia se elige sola si estaba vacía; el usuario la puede cambiar.
 */
export function CamposUbicacion({ provincia, ciudad }: { provincia?: string | null; ciudad?: string | null }) {
  const [prov, setProv] = useState((provincia ?? '').toUpperCase());
  const [ciu, setCiu] = useState((ciudad ?? '').toUpperCase());
  const provInicial = useRef((provincia ?? '').toUpperCase()).current;
  const ref = useRef<HTMLSelectElement>(null);
  const provRef = useRef(prov);
  const automatica = useRef(false);
  provRef.current = prov;

  function elegirProvincia(p: string) {
    setProv(p);
    setCiu((c) => (cantonesDe(p).includes(c) ? c : ''));
  }

  useEffect(() => {
    const i = ref.current?.form?.elements.namedItem('identificacion') as HTMLInputElement | null;
    if (!i) return;
    const alEscribir = () => {
      if (provRef.current !== '' && !automatica.current) return;
      automatica.current = true;
      elegirProvincia(provinciaDeIdentificacion(i.value) ?? '');
    };
    i.addEventListener('input', alEscribir);
    if (!provRef.current && i.value) alEscribir();
    return () => i.removeEventListener('input', alEscribir);
  }, []);

  const cantones = cantonesDe(prov);
  const otraCiudad = ciu && !cantones.includes(ciu);
  return (
    <>
      <div className="campo"><label>Provincia</label>
        <select ref={ref} name="provincia" value={prov} onChange={(e) => { automatica.current = false; elegirProvincia(e.target.value); }}>
          <option value="">Sin provincia</option>
          {provInicial && !PROVINCIAS.some((p) => p.nombre === provInicial) && <option value={provInicial}>{provInicial}</option>}
          {PROVINCIAS.map((p) => <option key={p.cod} value={p.nombre}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="campo"><label>Ciudad (cantón)</label>
        <select name="ciudad" value={ciu} onChange={(e) => setCiu(e.target.value)} disabled={!prov || !cantones.length && !otraCiudad}>
          <option value="">{prov ? 'Sin ciudad' : 'Elija primero la provincia'}</option>
          {otraCiudad && <option value={ciu}>{ciu}</option>}
          {cantones.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </>
  );
}
