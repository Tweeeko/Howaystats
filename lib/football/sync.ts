import "server-only";
import { adminDb } from "../database/client";
import { clubToRow, fixtureToRow, rowToClub, rowToFixture, standingToRow } from "../database/mappers";
import { computeStandings } from "./standings";
import {
  NEWCASTLE_ID,
  SUNDERLAND_ID,
  currentSeason,
  fetchEvents,
  fetchFixtureById,
  fetchFixtures,
  fetchLiveFixtures,
  fetchProviderStandings,
  fetchTeams,
  fetchTeamFixtures,
} from "./provider";
import type { Fixture } from "../types";

async function chunkedUpsert(table: string, rows: object[], onConflict: string) {
  const db = adminDb();
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

export async function loadSeason(season: number) {
  const db = adminDb();
  const [{ data: clubs, error: e1 }, { data: fx, error: e2 }] = await Promise.all([
    db.from("clubs").select("*"),
    // The table and the model only ever see Premier League fixtures.
    db.from("fixtures").select("*").eq("season", season).eq("league_id", 39).order("kickoff"),
  ]);
  if (e1 || e2) throw new Error((e1 ?? e2)!.message);
  const fixtures = (fx ?? []).map(rowToFixture);
  const ids = new Set<number>();
  fixtures.forEach((f) => (ids.add(f.homeId), ids.add(f.awayId)));
  const allClubs = (clubs ?? []).map(rowToClub);
  return { clubs: allClubs.filter((c) => ids.has(c.id)), allClubs, fixtures };
}

/** Newcastle & Sunderland fixtures outside the Premier League this season (Europe, cups). */
export async function loadCupFixtures(season: number) {
  const { data, error } = await adminDb().from("fixtures").select("*").eq("season", season).neq("league_id", 39).order("kickoff");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToFixture);
}

/** Recompute the table from stored fixtures and verify it against the provider's table. */
export async function recalculateTable(season: number, verify = true) {
  const { clubs, fixtures } = await loadSeason(season);
  const nameOf = (id: number) => clubs.find((c) => c.id === id)?.name ?? String(id);
  const table = computeStandings(clubs.map((c) => c.id), fixtures, nameOf);
  await chunkedUpsert("standings", table.map((s) => standingToRow(season, s)), "season,club_id");

  const mismatches: string[] = [];
  if (verify) {
    try {
      const provider = await fetchProviderStandings(season);
      for (const p of provider) {
        const ours = table.find((r) => r.clubId === p.team.id);
        if (!ours || ours.points !== p.points || ours.played !== p.all.played || ours.goalDifference !== p.goalsDiff) {
          mismatches.push(`${nameOf(p.team.id)}: ours ${ours?.played}/${ours?.points}pts/${ours?.goalDifference}GD vs provider ${p.all.played}/${p.points}pts/${p.goalsDiff}GD`);
        }
      }
    } catch (e) {
      mismatches.push(`verification skipped: ${(e as Error).message}`);
    }
  }
  return { clubs: table.length, mismatches };
}

/** Full refresh: teams, every fixture of the season, table recalculation + verification. */
export async function syncFootball() {
  const season = currentSeason();
  const db = adminDb();
  const { data: before } = await db.from("fixtures").select("id").eq("season", season).eq("status", "finished");
  const finishedBefore = new Set((before ?? []).map((r) => Number(r.id)));

  const teams = await fetchTeams(season);
  await chunkedUpsert("clubs", teams.map(clubToRow), "id");
  const fixtures = await fetchFixtures(season);
  await chunkedUpsert("fixtures", fixtures.map(fixtureToRow), "id");

  // Newcastle and Sunderland in every competition (Europe, FA Cup, League Cup): 2 extra calls.
  let otherComps = 0;
  for (const teamId of [NEWCASTLE_ID, SUNDERLAND_ID]) {
    const t = await fetchTeamFixtures(teamId, season);
    const extra = t.fixtures.filter((f) => f.leagueId !== 39);
    const opponents = t.teams.filter((c) => !teams.some((pl) => pl.id === c.id));
    if (opponents.length) await chunkedUpsert("clubs", opponents.map(clubToRow), "id");
    if (extra.length) await chunkedUpsert("fixtures", extra.map(fixtureToRow), "id");
    otherComps += extra.length;
  }

  const newlyFinished = fixtures.filter((f) => f.status === "finished" && !finishedBefore.has(f.id));
  if (newlyFinished.length) {
    await db
      .from("fixtures")
      .update({ verified_at: new Date().toISOString() })
      .in("id", newlyFinished.map((f) => f.id));
  }
  const table = await recalculateTable(season);
  return {
    season,
    clubs: teams.length,
    fixtures: fixtures.length,
    otherCompetitionFixtures: otherComps,
    finished: fixtures.filter((f) => f.status === "finished").length,
    postponed: fixtures.filter((f) => f.status === "postponed").length,
    newlyFinished: newlyFinished.length,
    mismatches: table.mismatches,
  };
}

const isTracked = (f: Fixture) => [f.homeId, f.awayId].some((id) => id === NEWCASTLE_ID || id === SUNDERLAND_ID);

/**
 * Live refresh — cheap: one call for all live PL games, plus events for Newcastle/Sunderland games.
 * When a stored live game is no longer in the live feed, it is re-fetched by id and only
 * marked finished once the provider says FT/AET/PEN (never assumed).
 */
export async function syncLive() {
  const season = currentSeason();
  const db = adminDb();
  const live = await fetchLiveFixtures();
  // Live non-PL games: make sure both clubs exist before storing the fixture.
  const unknown = live.filter((f) => f.leagueId !== 39);
  if (unknown.length) {
    const { data: known } = await db.from("clubs").select("id").in("id", unknown.flatMap((f) => [f.homeId, f.awayId]));
    const have = new Set((known ?? []).map((k) => k.id));
    const missing = unknown.filter((f) => !have.has(f.homeId) || !have.has(f.awayId));
    for (const f of missing) {
      const t = await fetchTeamFixtures(have.has(f.homeId) ? f.homeId : f.awayId, season);
      await chunkedUpsert("clubs", t.teams.map(clubToRow), "id");
    }
  }
  if (live.length) await chunkedUpsert("fixtures", live.map(fixtureToRow), "id");

  let events = 0;
  for (const f of live.filter(isTracked)) {
    const ev = await fetchEvents(f.id);
    const rows = ev.map((e) => ({
      fixture_id: f.id,
      minute: e.time.elapsed,
      extra: e.time.extra,
      team_id: e.team.id,
      player: e.player.name,
      assist: e.assist.name,
      type: e.type,
      detail: e.detail,
    }));
    if (rows.length) {
      const { error } = await db.from("fixture_events").upsert(rows, {
        onConflict: "fixture_id,minute,extra,team_id,type,detail,player",
        ignoreDuplicates: true,
      });
      if (!error) events += rows.length;
    }
  }

  // Games we think are live but the live feed no longer lists: verify by id.
  const liveIds = new Set(live.map((f) => f.id));
  const { data: stale } = await db.from("fixtures").select("id").eq("season", season).in("status", ["live", "halftime"]);
  let finished = 0;
  for (const r of stale ?? []) {
    if (liveIds.has(Number(r.id))) continue;
    const fresh = await fetchFixtureById(Number(r.id));
    if (!fresh) continue;
    await chunkedUpsert("fixtures", [fixtureToRow(fresh)], "id");
    if (fresh.status === "finished") {
      finished++;
      await db.from("fixtures").update({ verified_at: new Date().toISOString() }).eq("id", fresh.id);
      if (isTracked(fresh)) {
        const ev = await fetchEvents(fresh.id);
        if (ev.length) {
          await db.from("fixture_events").upsert(
            ev.map((e) => ({ fixture_id: fresh.id, minute: e.time.elapsed, extra: e.time.extra, team_id: e.team.id, player: e.player.name, assist: e.assist.name, type: e.type, detail: e.detail })),
            { onConflict: "fixture_id,minute,extra,team_id,type,detail,player", ignoreDuplicates: true },
          );
        }
      }
    }
  }
  if (finished) await recalculateTable(season);
  // Note: a finished European/cup game doesn't change the table, but it still triggers the misery/banter refresh.
  return { season, live: live.length, events, finished };
}

/** Is any Premier League match live or kicking off within the next 15 minutes? Used to pace polling. */
export async function matchWindowOpen() {
  const db = adminDb();
  const now = Date.now();
  const { count } = await db
    .from("fixtures")
    .select("id", { count: "exact", head: true })
    .or(
      `status.in.(live,halftime),and(status.eq.scheduled,kickoff.gte.${new Date(now - 3 * 3600_000).toISOString()},kickoff.lte.${new Date(now + 15 * 60_000).toISOString()})`,
    );
  return (count ?? 0) > 0;
}
