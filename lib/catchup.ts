import "server-only";
import { after } from "next/server";
import { adminDb } from "./database/client";
import { env } from "./env";
import { runNamedJob } from "./jobs";
import { maybeRefreshLive } from "./live";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "./football/provider";

/**
 * Results shouldn't wait for the next cron. Whenever someone loads a page, after the response
 * has gone out, check whether any Premier League game should be over by now (kicked off 1h55m+
 * ago) but is still stored as not finished. If so, pull the football feed (which re-models,
 * re-scores the misery meter and refreshes banter when results change). Throttled to once every
 * 10 minutes across all visitors. Pages regenerate every 60 seconds, so the new score shows
 * within a minute or two of the check.
 *
 * Also wakes the live feed when Newcastle or Sunderland have kicked off and nobody's polling yet.
 */
const FULL_TIME_MS = 115 * 60_000;
const THROTTLE_MS = 10 * 60_000;

export function scheduleCatchUp() {
  try {
    after(() => catchUp().catch((e) => console.error("[catchup]", (e as Error).message)));
  } catch {
    /* outside a request (build time): nothing to do */
  }
}

async function catchUp() {
  if (!env.footballApiKey() || !env.supabaseServiceKey()) return;
  const db = adminDb();
  const now = Date.now();
  const iso = (t: number) => new Date(t).toISOString();

  // A Toon or Mackem game on right now: get the live feed going.
  const { data: liveNow } = await db
    .from("fixtures")
    .select("id")
    .or(`home_id.in.(${NEWCASTLE_ID},${SUNDERLAND_ID}),away_id.in.(${NEWCASTLE_ID},${SUNDERLAND_ID})`)
    .gte("kickoff", iso(now - FULL_TIME_MS))
    .lte("kickoff", iso(now))
    .limit(1);
  if (liveNow?.length) await maybeRefreshLive();

  const { data: st } = await db.from("data_status").select("last_attempt_at").eq("key", "catchup").maybeSingle();
  if (st?.last_attempt_at && now - Date.parse(st.last_attempt_at) < THROTTLE_MS) return;

  const { data: overdue } = await db
    .from("fixtures")
    .select("id")
    .gte("kickoff", iso(now - 2 * 86_400_000))
    .lte("kickoff", iso(now - FULL_TIME_MS))
    .in("status", ["scheduled", "live", "halftime"])
    .limit(1);
  if (!overdue?.length) return;

  await db.from("data_status").upsert({ key: "catchup", last_attempt_at: iso(now) }, { onConflict: "key" });
  await runNamedJob("football");
}
