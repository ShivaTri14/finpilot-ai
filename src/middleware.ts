import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || "finpilot-fallback-secret-key-32chars";
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/investment") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/profile");

  if (isProtectedPage && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/goals/:path*",
    "/investment/:path*",
    "/chat/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
