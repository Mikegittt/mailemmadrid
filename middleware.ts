import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/compose", "/sent", "/inbox", "/templates", "/settings"];

export function middleware(request: NextRequest) {
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();
  const session = request.cookies.get("emmadrid_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const response = NextResponse.next();
  response.headers.set("cache-control", "no-store, private");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/compose/:path*", "/sent/:path*", "/inbox/:path*", "/templates/:path*", "/settings/:path*"] };
