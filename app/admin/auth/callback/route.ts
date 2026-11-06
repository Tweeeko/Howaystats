import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const sb = await supabaseServer();
  if (code && sb) await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/admin", req.url));
}
