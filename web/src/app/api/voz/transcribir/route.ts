import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/session';
import { sql } from '@/lib/db';
import { vozHabilitada } from '@/lib/voz/habilitada';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // ~ varios minutos de voz comprimida; una respuesta dura segundos

/** Vocabulario del negocio para que Whisper escriba bien nombres y códigos (máx. ~200 palabras) */
async function vocabulario(emisorId: number) {
  const filas = await sql<{ nombre: string }[]>`
    select p.nombre from producto p where p.id_emisor = ${emisorId} order by p.id desc limit 120`;
  const palabras = new Set<string>();
  for (const f of filas) for (const w of f.nombre.split(/[\s/,.-]+/)) if (w.length > 2) palabras.add(w.toLowerCase());
  const base = 'Factura en Ecuador. Consumidor final, cédula, RUC, efectivo, tarjeta, transferencia, descuento. Productos: ';
  // Groq acepta como máximo 896 caracteres de pista
  let lista = '';
  for (const w of palabras) { const s = lista ? `${lista}, ${w}` : w; if (base.length + s.length + 1 > 880) break; lista = s; }
  return `${base}${lista}.`;
}

/** Recibe la grabación del celular y devuelve el texto (Groq Whisper, gratis) */
export async function POST(req: Request) {
  const s = await sesionActual();
  if (!s?.emisorId || !vozHabilitada(s.emisorId)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const clave = process.env.GROQ_API_KEY;
  if (!clave) return NextResponse.json({ error: 'Falta configurar GROQ_API_KEY' }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || audio.size < 1000) return NextResponse.json({ texto: '' });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'La grabación es demasiado larga' }, { status: 413 });

  const tipo = audio.type || 'audio/webm';
  const ext = tipo.includes('mp4') || tipo.includes('m4a') || tipo.includes('aac') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : tipo.includes('wav') ? 'wav' : 'webm';
  const f = new FormData();
  f.append('file', audio, `respuesta.${ext}`);
  f.append('model', 'whisper-large-v3-turbo');
  f.append('language', 'es');
  f.append('temperature', '0');
  f.append('response_format', 'json');
  f.append('prompt', await vocabulario(s.emisorId));

  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}` },
    body: f,
    signal: AbortSignal.timeout(25_000),
  }).catch((e: Error) => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) }) as unknown as Response);
  const j = (await r.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!r.ok) {
    console.error('voz/transcribir', r.status, j.error?.message);
    return NextResponse.json({ error: r.status === 429 ? 'Se alcanzó el límite gratuito de Groq por este minuto. Espere un momento.' : 'No se pudo pasar la voz a texto' }, { status: 502 });
  }
  // Whisper a veces "inventa" frases con silencio; las descartamos
  const texto = (j.text ?? '').trim();
  if (/^(gracias( por ver)?|subtítulos .*|¡?suscríbete.*)[.!]*$/i.test(texto)) return NextResponse.json({ texto: '' });
  return NextResponse.json({ texto });
}
