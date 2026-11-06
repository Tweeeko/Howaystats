import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/database/client";
import { JOBS, runNamedJob, type JobName } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Action =
  | { action: "run"; job: JobName; force?: boolean }
  | { action: "moderate"; table: "news_articles" | "memes"; id: string; status: "published" | "rejected" | "pending" }
  | { action: "edit-news"; id: string; howay_headline: string; howay_commentary: string; breaking?: boolean }
  | { action: "edit-banter"; id: string; text?: string; status?: "published" | "hidden" }
  | { action: "feature-meme"; id: string };

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const body = (await req.json()) as Action;
  const db = adminDb();
  let result: unknown;

  switch (body.action) {
    case "run":
      if (!JOBS.includes(body.job)) return NextResponse.json({ error: "unknown job" }, { status: 400 });
      result = await runNamedJob(body.job, !!body.force);
      break;
    case "moderate": {
      if (body.table !== "news_articles" && body.table !== "memes") return NextResponse.json({ error: "bad table" }, { status: 400 });
      const patch: Record<string, unknown> = { status: body.status };
      if (body.table === "memes" && body.status === "published") patch.published_at = new Date().toISOString();
      const { error } = await db.from(body.table).update(patch).eq("id", body.id);
      result = { ok: !error, error: error?.message };
      break;
    }
    case "edit-news": {
      const { error } = await db
        .from("news_articles")
        .update({ howay_headline: body.howay_headline.slice(0, 120), howay_commentary: body.howay_commentary.slice(0, 600), breaking: !!body.breaking, rewrite_model: `admin:${admin}`, updated_at: new Date().toISOString() })
        .eq("id", body.id);
      result = { ok: !error, error: error?.message };
      break;
    }
    case "edit-banter": {
      const patch: Record<string, unknown> = { edited_at: new Date().toISOString() };
      if (body.text) { patch.text = body.text.slice(0, 240); patch.generated_by = `admin:${admin}`; }
      if (body.status) patch.status = body.status;
      const { error } = await db.from("banter").update(patch).eq("id", body.id);
      result = { ok: !error, error: error?.message };
      break;
    }
    case "feature-meme": {
      const today = new Date().toISOString().slice(0, 10);
      await db.from("memes").update({ featured_on: null }).eq("featured_on", today);
      const { error } = await db.from("memes").update({ featured_on: today, status: "published" }).eq("id", body.id);
      result = { ok: !error, error: error?.message };
      break;
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  await db.from("automation_logs").insert({ job: "admin", status: "ok", message: `${admin}: ${body.action}`, meta: body as unknown as Record<string, unknown> });
  revalidatePath("/", "layout");
  return NextResponse.json(result ?? { ok: true });
}
