import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function clave() {
  const s = process.env.FIRMAS_SECRET || process.env.SESSION_SECRET;
  if (!s) throw new Error('Falta FIRMAS_SECRET');
  return createHash('sha256').update(s).digest();
}

/** Cifra un texto con AES-256-GCM; devuelve iv.tag.datos en base64 */
export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), datos].map((b) => b.toString('base64')).join('.');
}

export function descifrar(valor: string) {
  const [iv, tag, datos] = valor.split('.').map((x) => Buffer.from(x, 'base64'));
  const d = createDecipheriv('aes-256-gcm', clave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(datos), d.final()]).toString('utf8');
}
