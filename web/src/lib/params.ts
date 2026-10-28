export type SP = Promise<Record<string, string | string[] | undefined>>;

export async function leerParams(sp: SP) {
  const raw = await sp;
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}

export function paginaDe(p: Record<string, string | undefined>) {
  const n = parseInt(p.p ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Convierte un texto a entero positivo o null */
export function entero(v: unknown): number | null {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function decimal(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function texto(v: unknown): string {
  return String(v ?? '').trim();
}
