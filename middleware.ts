import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-session";

/**
 * Admin protection: /admin and /api/admin need a valid signed admin cookie (see lib/admin-session).
 * The login page and the login endpoint are the only ways in. Everything else passes straight through.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();
  const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD);
  if (ok) return NextResponse.next();
  return pathname.startsWith("/api/") ? NextResponse.json({ error: "unauthorised" }, { status: 401 }) : NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
