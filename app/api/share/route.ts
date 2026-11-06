import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/database/client";
import { hashOf } from "@/lib/content/dedupe";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

/** Share counter (feeds "most shared"). Rate limited per IP per item. */
export async function POST(req: NextRequest) {
  try {
    const { id, table } = JSON.parse(await req.text());
    if (!UUID.test(id) || (table !== "news_articles" && table !== "memes")) return NextResponse.json({ ok: false }, { status: 400 });
    const db = adminDb();
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const { data: allowed } = await db.rpc("hit_rate_limit", { p_bucket: `share:${hashOf(ip + id)}`, p_limit: 1, p_window_seconds: 86_400 });
    if (allowed !== false) await db.rpc("increment_shares", { p_table: table, p_id: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
