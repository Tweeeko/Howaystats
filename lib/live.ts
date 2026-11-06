import "server-only";
import { adminDb, publicDb } from "./database/client";
import { rowToClub, rowToFixture } from "./database/mappers";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "./football/provider";
import { matchWindowOpen, syncLive } from "./football/sync";
import { env } from "./env";

export interface LivePayload {
  fetchedAt: string;
  source: "provider-live" | "database";
  fixtures: {
    id: number;
    status: string;
    statusShort: string;
    elapsed: number | null;
    kickoff: string;
    home: { id: number; name: string; code: string; logo: string | null; goals: number | null };
    away: { id: number; name: string; code: string; logo: string | null; goals: number | null };
    ht: { home: number | null; away: number | null };
    events: { minute: number; extra: number | null; team_id: number; player: string | null; type: string; detail: string }[];
    derby: boolean;
  }[];
}

/**
 * Visitor-driven live refresh that respects provider limits: while a match window is open, the first
 * request after 60s triggers one provider poll (live feed + tracked events). Works on Vercel Hobby,
 * where cron jobs can only run daily.
 */
export async function maybeRefreshLive(): Promise<boolean> {
  if (!env.footballApiKey() || !env.supabaseServiceKey()) return false;
  const db = adminDb();
  const { data } = await db.from("data_status").select("last_attempt_at").eq("key", "live").maybeSingle();
  if (data?.last_attempt_at && Date.now() - Date.parse(data.last_attempt_at) < 60_000) return false;
  if (!(await matchWindowOpen())) return false;
  // Claim the slot first so concurrent visitors don't double-poll.
  await db.from("data_status").upsert({ key: "live", last_attempt_at: new Date().toISOString() }, { onConflict: "key" });
  try {
    await syncLive();
    await db.from("data_status").upsert({ key: "live", last_success_at: new Date().toISOString(), last_error: null }, { onConflict: "key" });
    return true;
  } catch (e) {
    await db.from("data_status").upsert({ key: "live", last_error: (e as Error).message }, { onConflict: "key" });
    return false;
  }
}

/** Tracked (Newcastle / Sunderland) fixtures that are live, or finished within the last 3 hours. */
export async function buildLivePayload(refreshed: boolean): Promise<LivePayload> {
  const db = publicDb();
  const empty: LivePayload = { fetchedAt: new Date().toISOString(), source: "database", fixtures: [] };
  if (!db) return empty;
  const since = new Date(Date.now() - 3.5 * 3600_000).toISOString();
  const { data: fx } = await db
    .from("fixtures")
    .select("*")
    .or(`home_id.in.(${NEWCASTLE_ID},${SUNDERLAND_ID}),away_id.in.(${NEWCASTLE_ID},${SUNDERLAND_ID})`)
    .gte("kickoff", since)
    .lte("kickoff", new Date().toISOString())
    .order("kickoff");
  // A live match always kicked off within the last 3.5 hours, so this window covers live, HT and just-finished.
  const fixtures = (fx ?? []).map(rowToFixture).filter((f) => ["live", "halftime", "finished"].includes(f.status));
  if (!fixtures.length) return { ...empty, source: refreshed ? "provider-live" : "database" };
  const ids = [...new Set(fixtures.flatMap((f) => [f.homeId, f.awayId]))];
  const [{ data: clubs }, { data: events }] = await Promise.all([
    db.from("clubs").select("*").in("id", ids),
    db.from("fixture_events").select("*").in("fixture_id", fixtures.map((f) => f.id)).order("minute"),
  ]);
  const club = (id: number) => {
    const c = (clubs ?? []).map(rowToClub).find((x) => x.id === id);
    return { id, name: c?.name ?? String(id), code: c?.code ?? "???", logo: c?.logoUrl ?? null };
  };
  return {
    fetchedAt: new Date().toISOString(),
    source: refreshed ? "provider-live" : "database",
    fixtures: fixtures.map((f) => ({
      id: f.id,
      status: f.status,
      statusShort: f.statusShort,
      elapsed: f.elapsed,
      kickoff: f.kickoff,
      home: { ...club(f.homeId), goals: f.homeGoals },
      away: { ...club(f.awayId), goals: f.awayGoals },
      ht: { home: f.htHome, away: f.htAway },
      events: (events ?? []).filter((e) => Number(e.fixture_id) === f.id),
      derby: [f.homeId, f.awayId].includes(NEWCASTLE_ID) && [f.homeId, f.awayId].includes(SUNDERLAND_ID),
    })),
  };
}
