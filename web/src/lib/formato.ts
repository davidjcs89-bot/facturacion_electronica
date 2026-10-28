const dinero = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(n: number | string | null | undefined) {
  if (n == null || n === '') return '';
  return dinero.format(Number(n));
}

/** Las fechas de la base se guardan en hora local de Ecuador sin zona; se muestran tal cual. */
function partes(d: Date | string) {
  const x = typeof d === 'string' ? new Date(d) : d;
  const p = (v: number) => String(v).padStart(2, '0');
  return { y: x.getFullYear(), m: p(x.getMonth() + 1), d: p(x.getDate()), h: p(x.getHours()), mi: p(x.getMinutes()) };
}

export function fecha(d: Date | string | null | undefined) {
  if (!d) return '';
  const p = partes(d);
  return `${p.d}/${p.m}/${p.y}`;
}

export function fechaHora(d: Date | string | null | undefined) {
  if (!d) return '';
  const p = partes(d);
  return `${p.d}/${p.m}/${p.y} ${p.h}:${p.mi}`;
}

/** yyyy-mm-dd para inputs type=date */
export function fechaInput(d: Date | string | null | undefined) {
  if (!d) return '';
  const p = partes(d);
  return `${p.y}-${p.m}-${p.d}`;
}

/** Fecha y hora actuales de Ecuador (UTC-5) como Date "local" para guardar en columnas timestamp sin zona */
export function ahoraEcuador() {
  const ahora = new Date();
  return new Date(ahora.getTime() - 5 * 3600 * 1000 + ahora.getTimezoneOffset() * 60 * 1000);
}

export function hoyEcuadorISO() {
  return fechaInput(ahoraEcuador());
}

const dinero3 = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
/** Monto con 3 decimales (precios unitarios) */
export function money3(n: number | string | null | undefined) {
  if (n == null || n === '') return '';
  return dinero3.format(Number(n));
}
