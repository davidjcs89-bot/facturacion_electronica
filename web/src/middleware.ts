import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLICAS = ['/login', '/recuperar'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  const token = req.cookies.get('fe_sesion')?.value;
  let valido = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      valido = true;
    } catch {
      valido = false;
    }
  }
  if (!valido) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg).*)'],
};
