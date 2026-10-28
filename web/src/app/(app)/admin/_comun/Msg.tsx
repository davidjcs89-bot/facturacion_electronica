export type EstadoForm = { ok?: boolean; mensaje?: string };

/** Mensaje de resultado de un formulario */
export function Msg({ e }: { e: EstadoForm }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}
