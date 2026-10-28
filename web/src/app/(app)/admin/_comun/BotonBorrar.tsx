'use client';

/** Boton de envio que pide confirmacion antes de borrar */
export function BotonBorrar({ texto = 'Eliminar', pregunta = '¿Eliminar este registro?', chico }: { texto?: string; pregunta?: string; chico?: boolean }) {
  return (
    <button className={`btn peligro ${chico ? 'chico' : ''}`} onClick={(ev) => { if (!confirm(pregunta)) ev.preventDefault(); }}>
      {texto}
    </button>
  );
}
