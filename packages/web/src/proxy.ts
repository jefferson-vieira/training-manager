import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { authClient } from '@/lib/auth';

const publicRoutes = new Set([
  '/forgot-password',
  '/login',
  '/reset-password',
  '/signup',
]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.has(path);

  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!isPublicRoute && !session.data?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && session.data?.user && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
