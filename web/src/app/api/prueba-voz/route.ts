// TEMPORAL: probar la interpretación de dictados de Victoria Jervis (52) sin sesión. Solo vista previa con PRUEBA_VOZ=si. Solo lectura.
import { NextResponse, type NextRequest } from 'next/server';
import { interpretarDictado, type BorradorVoz } from '@/lib/voz/interpretar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PRUEBA_VOZ !== 'si') return new NextResponse('no', { status: 404 });
  if (req.nextUrl.searchParams.get('groq')) {
    const k = process.env.GROQ_API_KEY;
    if (!k) return NextResponse.json({ groq: 'sin clave' });
    const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${k}` } });
    const j = (await r.json().catch(() => ({}))) as { data?: { id: string }[] };
    return NextResponse.json({ groq: r.status, largo: k.length, whisper: (j.data ?? []).map((m) => m.id).filter((x) => x.includes('whisper')) });
  }
  const texto = req.nextUrl.searchParams.get('texto') ?? '';
  const previo = req.nextUrl.searchParams.get('previo');
  const t0 = Date.now();
  try {
    const b = await interpretarDictado(52, texto, previo ? (JSON.parse(previo) as BorradorVoz) : null);
    return NextResponse.json({ ms: Date.now() - t0, b });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
