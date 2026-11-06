import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/database/client";
import { canonicalUrl, hashOf } from "@/lib/content/dedupe";

export const dynamic = "force-dynamic";

const isHttpUrl = (s: unknown): s is string => {
  if (typeof s !== "string" || s.length > 600) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/** Community meme submissions → moderation queue. Rate limited per IP (5 per hour). */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true }); // honeypot
  if (body.rights !== "yes") return NextResponse.json({ error: "Please confirm you're allowed to share it." }, { status: 400 });
  if (!isHttpUrl(body.sourceUrl)) return NextResponse.json({ error: "That link doesn't look right." }, { status: 400 });
  if (body.mediaUrl && !isHttpUrl(body.mediaUrl)) return NextResponse.json({ error: "Image link doesn't look right." }, { status: 400 });
  const title = String(body.title ?? "").trim().slice(0, 140);
  if (title.length < 3) return NextResponse.json({ error: "Give it a title." }, { status: 400 });
  const name = String(body.name ?? "").trim().replace(/[<>]/g, "").slice(0, 40) || null;

  let db;
  try {
    db = adminDb();
  } catch {
    return NextResponse.json({ error: "Submissions are not open yet." }, { status: 503 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const { data: allowed } = await db.rpc("hit_rate_limit", { p_bucket: `meme:${hashOf(ip)}`, p_limit: 5, p_window_seconds: 3600 });
  if (allowed === false) return NextResponse.json({ error: "Steady on — try again in an hour." }, { status: 429 });

  const url = canonicalUrl(body.sourceUrl as string);
  const { error } = await db.from("memes").insert({
    source: "community",
    source_url: url,
    url_hash: hashOf(url),
    media_url: (body.mediaUrl as string) || null,
    media_type: "image",
    title,
    submitted_by: name,
    licence_note: "Community submission. Submitter confirmed they may share it; original link credited.",
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "We've already got that one." }, { status: 409 });
    return NextResponse.json({ error: "Couldn't save it." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
