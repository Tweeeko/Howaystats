import "server-only";
import { adminDb } from "../database/client";
import { rowToFixture } from "../database/mappers";
import { loadSeason } from "../football/sync";
import { computeStandings, countsTowardsTable } from "../football/standings";
import { currentSeason } from "../football/provider";
import { hashOf } from "../content/dedupe";
import { env } from "../env";
import { fitRatings } from "./ratings";
import { modelConfidence, simulateSeason } from "./montecarlo";

/**
 * Re-fit team strength and re-run the 50,000-season simulation.
 * Skips work when no result has changed since the last run (unless forced).
 */
export async function runPredictions(force = false) {
  const season = currentSeason();
  const db = adminDb();
  const { clubs, fixtures } = await loadSeason(season);
  if (clubs.length < 2) throw new Error("No clubs/fixtures stored yet — run the football refresh first");

  const done = fixtures.filter(countsTowardsTable);
  const inputHash = hashOf(done.map((f) => `${f.id}:${f.homeGoals}-${f.awayGoals}`).sort().join("|") + `|n=${env.simulations()}`);
  if (!force) {
    const { data: last } = await db.from("model_runs").select("input_hash").eq("season", season).order("created_at", { ascending: false }).limit(1);
    if (last?.[0]?.input_hash === inputHash) return { skipped: true, reason: "no new results" };
  }

  // Historical performance: last season's matches (lower weight) and last season's final ratings as priors.
  const { data: prevFx } = await db.from("fixtures").select("*").eq("season", season - 1);
  const history = (prevFx ?? []).map(rowToFixture);
  const { data: prevRun } = await db.from("model_runs").select("id").eq("season", season - 1).order("created_at", { ascending: false }).limit(1);
  const priors = new Map<number, { attack: number; defence: number }>();
  if (prevRun?.[0]) {
    const { data: pp } = await db.from("predictions").select("club_id, attack, defence").eq("run_id", prevRun[0].id);
    for (const p of pp ?? []) if (p.attack !== null) priors.set(p.club_id, { attack: Number(p.attack) * 0.6, defence: Number(p.defence) * 0.6 });
  }
  // Promoted clubs with no prior start slightly below average (historically promoted sides concede more).
  for (const c of clubs) if (!priors.has(c.id) && !history.some((f) => f.homeId === c.id || f.awayId === c.id)) priors.set(c.id, { attack: -0.15, defence: 0.15 });

  const ids = clubs.map((c) => c.id);
  const nameOf = (id: number) => clubs.find((c) => c.id === id)?.name ?? String(id);
  const table = computeStandings(ids, fixtures, nameOf);
  const model = fitRatings(ids, fixtures, history, { priors });
  const remaining = fixtures.filter((f) => !countsTowardsTable(f) && f.status !== "cancelled");
  const seed = parseInt(inputHash.slice(0, 8), 16);
  const sim = simulateSeason(table, remaining, model, { simulations: env.simulations(), seed });

  const avgPlayed = table.reduce((s, r) => s + r.played, 0) / table.length;
  const conf = modelConfidence(avgPlayed, 2 * (ids.length - 1));

  const { data: run, error } = await db
    .from("model_runs")
    .insert({
      season,
      simulations: sim.simulations,
      seed,
      fixtures_remaining: sim.fixturesRemaining,
      matches_used: model.matchesUsed,
      home_advantage: model.homeAdvantage,
      duration_ms: sim.durationMs,
      input_hash: inputHash,
      confidence: conf.level,
      notes: conf.note,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = sim.clubs.map((c) => ({
    run_id: run.id,
    club_id: c.clubId,
    expected_points: c.expectedPoints,
    expected_position: c.expectedPosition,
    projected_position: c.projectedPosition,
    median_points: c.medianPoints,
    points_p10: c.pointsP10,
    points_p90: c.pointsP90,
    position_probs: c.positionProbs,
    p_title: c.pTitle,
    p_top4: c.pTop4,
    p_top5: c.pTop5,
    p_top6: c.pTop6,
    p_top7: c.pTop7,
    p_top10: c.pTop10,
    p_relegation: c.pRelegation,
    p_survival: c.pSurvival,
    p18: c.p18,
    p19: c.p19,
    p20: c.p20,
    fixture_difficulty: c.fixtureDifficulty,
    remaining: c.remaining,
    attack: model.ratings.get(c.clubId)!.attack,
    defence: model.ratings.get(c.clubId)!.defence,
  }));
  const { error: e2 } = await db.from("predictions").insert(rows);
  if (e2) throw new Error(e2.message);
  return { runId: run.id, simulations: sim.simulations, durationMs: sim.durationMs, fixturesRemaining: sim.fixturesRemaining, confidence: conf.level };
}
