/**
 * Empresas con facturación por voz (piloto). Variable FACTURA_VOZ_EMISORES: ids separados por coma.
 * Sin la variable: solo Victoria Jervis (52), la empresa piloto aprobada por David el 19/11/2026.
 */
export function vozHabilitada(emisorId: number | null | undefined): boolean {
  if (!emisorId || !process.env.ANTHROPIC_API_KEY) return false;
  const lista = (process.env.FACTURA_VOZ_EMISORES ?? '52').split(',').map((x) => Number(x.trim())).filter(Boolean);
  return lista.includes(emisorId);
}
