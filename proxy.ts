import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PROTECTED_ROUTES, PUBLIC_AUTH_ROUTES, SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export function isProtectedPath(pathname: string) {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*", "/today/:path*", "/trends/:path*", "/settings/:path*"],
};
