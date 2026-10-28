import { randomInt } from 'node:crypto';

/** Digito verificador modulo 11 (pesos 2..7 de derecha a izquierda) */
export function digitoVerificador(cadena: string): string {
  let factor = 2;
  let suma = 0;
  for (let i = cadena.length - 1; i >= 0; i--) {
    suma += parseInt(cadena[i], 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const v = 11 - (suma % 11);
  if (v === 11) return '0';
  if (v === 10) return '1';
  return String(v);
}

/**
 * Clave de acceso de 49 digitos:
 * fecha(ddmmaaaa) + codDoc(2) + ruc(13) + ambiente(1) + serie(6) + secuencial(9) + codigoNumerico(8) + tipoEmision(1) + verificador(1)
 */
export function generarClaveAcceso(p: {
  fecha: Date; codDoc: string; ruc: string; ambiente: string; numero: string; tipoEmision?: string; codigoNumerico?: string;
}): string {
  const d = p.fecha;
  const pad = (v: number) => String(v).padStart(2, '0');
  const fecha = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
  const codigo = p.codigoNumerico ?? String(randomInt(0, 100000000)).padStart(8, '0');
  const base = `${fecha}${p.codDoc}${p.ruc}${p.ambiente}${p.numero.replace(/-/g, '')}${codigo}${p.tipoEmision ?? '1'}`;
  if (!/^\d{48}$/.test(base)) throw new Error(`Clave de acceso inválida (${base.length} dígitos): revise RUC, número y fecha`);
  return base + digitoVerificador(base);
}
