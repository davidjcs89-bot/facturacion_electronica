import 'server-only';
import { gunzipSync, gzipSync } from 'node:zlib';

/** XML autorizado tal como se guarda: en texto, o comprimido (gzip) en los comprobantes antiguos */
export function xmlAutorizado(texto: string | null | undefined, gz: Uint8Array | null | undefined): string | null {
  if (texto) return texto;
  if (gz && gz.length) return gunzipSync(Buffer.from(gz)).toString('utf8');
  return null;
}

/** Comprime un XML para guardarlo en xml_retornado_gz; comprueba que se recupera idéntico */
export function comprimirXml(texto: string): Buffer {
  const gz = gzipSync(Buffer.from(texto, 'utf8'), { level: 9 });
  if (gunzipSync(gz).toString('utf8') !== texto) throw new Error('La compresión no devolvió el mismo XML');
  return gz;
}
