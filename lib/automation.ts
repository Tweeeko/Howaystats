import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "./database/client";
import { env } from "./env";

/** Cron endpoints accept `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends automatically). */
export function authorisedCron(req: NextRequest): boolean {
  const secret = env.cronSecret();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export function unauthorised() {
  return NextResponse.json({ error: "unauthorised" }, { status: 401 });
}

/**
 * Run a job with logging + status bookkeeping. A failure is recorded and returned,
 * never thrown, so one broken content source can't take the football pipeline down.
 */
export async function runJob<T>(job: string, fn: () => Promise<T>): Promise<{ ok: boolean; result?: T; error?: string }> {
  const started = Date.now();
  const db = adminDb();
  await db.from("data_status").upsert({ key: job, last_attempt_at: new Date().toISOString() }, { onConflict: "key" });
  try {
    const result = await fn();
    const meta = typeof result === "object" && result !== null ? (result as Record<string, unknown>) : { result };
    await Promise.all([
      db.from("automation_logs").insert({ job, status: "ok", message: "completed", meta, duration_ms: Date.now() - started }),
      db.from("data_status").upsert(
        { key: job, last_success_at: new Date().toISOString(), last_attempt_at: new Date().toISOString(), last_error: null, meta },
        { onConflict: "key" },
      ),
    ]);
    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[job:${job}]`, message);
    await Promise.allSettled([
      db.from("automation_logs").insert({ job, status: "error", message, duration_ms: Date.now() - started }),
      db.from("data_status").upsert({ key: job, last_error: message, last_attempt_at: new Date().toISOString() }, { onConflict: "key" }),
    ]);
    return { ok: false, error: message };
  }
}

export function jobResponse(r: { ok: boolean; result?: unknown; error?: string }) {
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
