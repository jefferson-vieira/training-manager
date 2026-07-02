import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = new Set(['/login']);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.has(path);

  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: 'training-manager',
  });

  if (!isPublicRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && sessionCookie && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
