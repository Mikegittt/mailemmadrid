import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/compose", "/sent", "/templates", "/settings"];

export function middleware(request: NextRequest) {
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();
  if (!request.cookies.has("emmadrid_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/compose/:path*", "/sent/:path*", "/templates/:path*", "/settings/:path*"] };
