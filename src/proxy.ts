import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const AUTH_ROUTES = ["/login", "/register"];

/**
 * Optimistic cookie guard only: it keeps signed-out visitors out of app routes
 * without a database round-trip. It deliberately does NOT bounce requests away
 * from /login, because a cookie can outlive its session row; the auth pages ask
 * the database instead, so a stale cookie can't cause a redirect loop.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (!hasSessionCookie && !isAuthRoute) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/projects/:path*", "/login", "/register", "/join/:path*"],
};
