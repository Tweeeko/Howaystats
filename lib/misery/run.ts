import "server-only";
import { adminDb } from "../database/client";
import { loadCupFixtures, loadSeason } from "../football/sync";
import { computeStandings } from "../football/standings";
import { NEWCASTLE_ID, SUNDERLAND_ID, currentSeason } from "../football/provider";
import { happiness, miseryEvents, miseryIndexAt, tearJar } from "./index";
import { mackemMeter } from "../meter";

/** Recompute the Misery Meter (plus the older internal misery index) and store a snapshot. */
export async function runMisery() {
  const season = currentSeason();
  const db = adminDb();
  const { clubs, fixtures } = await loadSeason(season);
  const cupFixtures = await loadCupFixtures(season);
  const ids = clubs.map((c) => c.id);
  if (!ids.includes(SUNDERLAND_ID)) return { skipped: true, reason: "Sunderland are not in this league season" };
  const { data: allClubs } = await db.from("clubs").select("id, short_name");
  const nameOf = (id: number) => allClubs?.find((c) => c.id === id)?.short_name ?? String(id);

  const { data: runs } = await db.from("model_runs").select("id, created_at").eq("season", season).order("created_at");
  const runIds = (runs ?? []).map((r) => r.id);
  const { data: preds } = runIds.length
    ? await db.from("predictions").select("run_id, club_id, p_relegation, p_top6").in("run_id", runIds).in("club_id", [SUNDERLAND_ID, NEWCASTLE_ID])
    : { data: [] as { run_id: string; club_id: number; p_relegation: number; p_top6: number }[] };
  const latestRun = runIds[runIds.length - 1];
  const sunLatest = (preds ?? []).find((p) => p.run_id === latestRun && p.club_id === SUNDERLAND_ID);
  const nufcLatest = (preds ?? []).find((p) => p.run_id === latestRun && p.club_id === NEWCASTLE_ID);

  const { data: news } = await db
    .from("news_articles")
    .select("published_at")
    .eq("status", "published")
    .eq("club", "sunderland")
    .gte("negativity", 0.4)
    .gte("published_at", `${season}-07-01`);

  const events = miseryEvents({
    clubIds: ids,
    fixtures,
    cupFixtures,
    sunderlandId: SUNDERLAND_ID,
    newcastleId: NEWCASTLE_ID,
    negativeNewsDates: (news ?? []).map((n) => n.published_at).filter(Boolean),
    nameOf,
  });

  const table = computeStandings(ids, fixtures, nameOf);
  const sun = table.find((r) => r.clubId === SUNDERLAND_ID)!;
  const nufc = table.find((r) => r.clubId === NEWCASTLE_ID);
  const pRel = sunLatest ? Number(sunLatest.p_relegation) : 0;
  const now = new Date();
  const idx = miseryIndexAt(events, { pRelegation: pRel, position: sun.position, leagueSize: ids.length }, now);
  const jar = tearJar(fixtures, SUNDERLAND_ID, nameOf, 2 * (ids.length - 1));
  const meter = mackemMeter({ fixtures: [...fixtures, ...cupFixtures], sunderlandId: SUNDERLAND_ID, newcastleId: NEWCASTLE_ID, position: sun.position, leagueSize: ids.length });
  const meterPercent = meter.total ? Math.round((100 * meter.bad) / meter.total) : 0;
  const happy = nufc
    ? happiness(nufc, nufcLatest ? Number(nufcLatest.p_top6) : 0, 0)
    : { score: 0, line: "" };

  const weekAgo = now.getTime() - 7 * 86_400_000;
  const recent = events.filter((e) => Date.parse(e.at) >= weekAgo && e.misery !== 0);
  const biggest = recent.sort((a, b) => Math.abs(b.misery) - Math.abs(a.misery))[0];

  // Archive the finished season's jar when the season rolls over (keeps previous-season stats).
  const { data: lastSeasonJar } = await db.from("tear_jar_seasons").select("season").eq("season", season - 1).maybeSingle();
  if (!lastSeasonJar) {
    const { data: prevSnap } = await db.from("misery_snapshots").select("*").eq("season", season - 1).order("taken_at", { ascending: false }).limit(1);
    if (prevSnap?.[0]) {
      const p = prevSnap[0];
      await db.from("tear_jar_seasons").insert({
        season: season - 1,
        final_percent: p.jar_percent,
        final_units: p.jar_units,
        tears_collected: 0, // retired: the Tears Index has gone
        overflowed: Number(p.jar_percent) >= 100,
        history: p.payload?.jarHistory ?? [],
      });
    }
  }

  const { error } = await db.from("misery_snapshots").insert({
    season,
    misery_index: idx.score,
    state_score: idx.stateScore,
    event_score: idx.eventScore,
    jar_percent: meterPercent, // Misery Meter: share of bad signs
    jar_units: jar.dropped,
    happiness: happy.score,
    biggest_event: biggest?.label ?? null,
    payload: { meter: { bad: meter.bad, total: meter.total, level: meter.levelName, signs: meter.signs }, jarHistory: jar.history.slice(0, 38), recentEvents: recent.slice(0, 10), parts: idx.parts },
  });
  if (error) throw new Error(error.message);
  return { misery: idx.score, meter: `${meter.bad}/${meter.total}`, happiness: happy.score, events: events.length };
}
