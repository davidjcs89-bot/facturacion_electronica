import { TIPO_IDENTIFICACION } from './constantes';

/** Valida cedula ecuatoriana (modulo 10) */
export function cedulaValida(c: string) {
  if (!/^\d{10}$/.test(c)) return false;
  const prov = parseInt(c.slice(0, 2), 10);
  if (prov < 1 || (prov > 24 && prov !== 30)) return false;
  if (parseInt(c[2], 10) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = parseInt(c[i], 10) * (i % 2 === 0 ? 2 : 1);
    if (v > 9) v -= 9;
    suma += v;
  }
  const ver = (10 - (suma % 10)) % 10;
  return ver === parseInt(c[9], 10);
}

/** Validacion basica de RUC: 13 digitos terminados en 001 (o mayor) */
export function rucValido(r: string) {
  return /^\d{13}$/.test(r) && parseInt(r.slice(10), 10) >= 1;
}

export function validarIdentificacion(tipo: number, ident: string): string | null {
  if (!ident) return 'Ingrese la identificación';
  if (tipo === TIPO_IDENTIFICACION.CEDULA && !cedulaValida(ident)) return 'La cédula no es válida';
  if (tipo === TIPO_IDENTIFICACION.RUC && !rucValido(ident)) return 'El RUC debe tener 13 dígitos';
  if (tipo === TIPO_IDENTIFICACION.CONSUMIDOR_FINAL && ident !== '9999999999999') return 'Consumidor final usa 9999999999999';
  if (ident.length > 13) return 'La identificación no puede superar 13 caracteres';
  return null;
}

export function emailValido(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
