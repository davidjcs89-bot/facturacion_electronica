// TEMPORAL: probar la interpretación de dictados de Victoria Jervis (52) sin sesión. Solo vista previa con PRUEBA_VOZ=si. Solo lectura.
import { NextResponse, type NextRequest } from 'next/server';
import { interpretarDictado, type BorradorVoz } from '@/lib/voz/interpretar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PRUEBA_VOZ !== 'si') return new NextResponse('no', { status: 404 });
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
