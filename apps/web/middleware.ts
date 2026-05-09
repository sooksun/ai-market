import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api'];
// Files served from /public — must bypass auth so login page can show logo etc.
const STATIC_FILE_RE = /\.(png|jpe?g|svg|webp|gif|ico|css|js|map|woff2?|ttf|otf|txt)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }
  if (STATIC_FILE_RE.test(pathname)) {
    return NextResponse.next();
  }
  const session = req.cookies.get('aim_session');
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
