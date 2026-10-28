/**
 * Generador de XML en forma canonica (C14N 1.0): sin declaracion, etiquetas de cierre explicitas,
 * atributos ordenados y caracteres escapados como en C14N. Asi el digest del comprobante coincide
 * con el que calcula el SRI al validar la firma.
 */
export type Nodo = string | number | null | undefined | false | Nodo[];

export function escTexto(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
}

export function escAtributo(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;');
}

function aplanar(n: Nodo, out: string[]) {
  if (n === null || n === undefined || n === false) return;
  if (Array.isArray(n)) n.forEach((x) => aplanar(x, out));
  else out.push(String(n));
}

/** Elemento con hijos ya serializados (usar t() para texto) */
export function el(nombre: string, attrs: Record<string, string | number | null | undefined> | null, ...hijos: Nodo[]): string {
  const a = attrs
    ? Object.entries(attrs)
        .filter(([, v]) => v !== null && v !== undefined)
        .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
        .map(([k, v]) => ` ${k}="${escAtributo(String(v))}"`)
        .join('')
    : '';
  const contenido: string[] = [];
  aplanar(hijos, contenido);
  return `<${nombre}${a}>${contenido.join('')}</${nombre}>`;
}

/** Elemento con contenido de texto escapado; se omite si el valor es null/undefined/'' */
export function t(nombre: string, valor: string | number | null | undefined, attrs?: Record<string, string>): string {
  if (valor === null || valor === undefined || valor === '') return '';
  return el(nombre, attrs ?? null, escTexto(String(valor)));
}

/** Igual a CleanText de la app anterior: quita tildes/diacriticos y normaliza espacios */
export function limpiar(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Numero con decimales fijos (formato SRI, punto decimal) */
export function dec(n: number | string | null | undefined, d = 2): string {
  const v = Number(n ?? 0);
  return (Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d).toFixed(d);
}

/** dd/mm/aaaa */
export function fechaSRI(d: Date | string) {
  const x = typeof d === 'string' ? new Date(d) : d;
  const p = (v: number) => String(v).padStart(2, '0');
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
}
