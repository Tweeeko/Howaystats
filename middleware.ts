import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Admin protection. /admin and /api/admin require a Supabase Auth session whose email is in ADMIN_EMAIL
 * (comma-separated). Everything else passes straight through.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/auth")) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const allow = (process.env.ADMIN_EMAIL ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const deny = () =>
    pathname.startsWith("/api/") ? NextResponse.json({ error: "unauthorised" }, { status: 401 }) : NextResponse.redirect(new URL("/admin/login", req.url));
  if (!url || !key || !allow.length) return deny();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email || !allow.includes(email)) return deny();
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
