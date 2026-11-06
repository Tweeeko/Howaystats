import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS, makeAdminToken, safeEqual } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

/** POST { password } → sets the admin cookie. DELETE → signs out. */
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return NextResponse.json({ error: "ADMIN_PASSWORD isn't set in Vercel yet." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const given = typeof body.password === "string" ? body.password : "";
  if (!safeEqual(given, secret)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await makeAdminToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_DAYS * 86_400,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
