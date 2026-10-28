/** Codigo de barras Code 128 (sets B y C) devuelto como secuencia de anchos de barras/espacios. */
const PATRONES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

/** Codifica texto: usa set C para pares de digitos y set B para lo demas. */
export function code128(texto: string): string {
  const codigos: number[] = [];
  let i = 0;
  const esPar = (k: number) => /^\d\d$/.test(texto.slice(k, k + 2));
  let set: 'B' | 'C';
  if (esPar(0) && /^\d{4,}/.test(texto)) {
    codigos.push(START_C);
    set = 'C';
  } else {
    codigos.push(START_B);
    set = 'B';
  }
  while (i < texto.length) {
    if (set === 'C') {
      if (esPar(i)) {
        codigos.push(parseInt(texto.slice(i, i + 2), 10));
        i += 2;
      } else {
        codigos.push(CODE_B);
        set = 'B';
      }
    } else {
      if (/^\d{4}/.test(texto.slice(i)) && (texto.length - i) % 2 === 0) {
        codigos.push(CODE_C);
        set = 'C';
        continue;
      }
      const c = texto.charCodeAt(i);
      if (c < 32 || c > 126) throw new Error('Carácter no soportado en Code128');
      codigos.push(c - 32);
      i += 1;
    }
  }
  let suma = codigos[0];
  for (let k = 1; k < codigos.length; k++) suma += codigos[k] * k;
  codigos.push(suma % 103);
  codigos.push(STOP);
  return codigos.map((c) => PATRONES[c]).join('');
}
