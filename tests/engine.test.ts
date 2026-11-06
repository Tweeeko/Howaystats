import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixture } from "../lib/types";
import { computeStandings, pointsInLast } from "../lib/football/standings";
import { fitRatings, expectedGoals } from "../lib/predictions/ratings";
import { simulateSeason, matchProbabilities, marginOfError } from "../lib/predictions/montecarlo";
import { safetyThreshold, northEastScore } from "../lib/predictions/safety";

let fid = 1;
const fx = (
  homeId: number,
  awayId: number,
  hg: number | null,
  ag: number | null,
  status: Fixture["status"] = "finished",
  day = 1,
): Fixture => ({
  id: fid++,
  season: 2026,
  round: null,
  kickoff: new Date(Date.UTC(2026, 7, day)).toISOString(),
  status,
  statusShort: status === "finished" ? "FT" : "NS",
  elapsed: null,
  homeId,
  awayId,
  homeGoals: hg,
  awayGoals: ag,
  htHome: null,
  htAway: null,
});

test("points: win 3, draw 1, loss 0", () => {
  const t = computeStandings([1, 2, 3], [fx(1, 2, 2, 0), fx(2, 3, 1, 1), fx(3, 1, 0, 1)]);
  const by = new Map(t.map((r) => [r.clubId, r]));
  assert.equal(by.get(1)!.points, 6);
  assert.equal(by.get(2)!.points, 1);
  assert.equal(by.get(3)!.points, 1);
  assert.equal(by.get(1)!.won, 2);
  assert.equal(by.get(2)!.drawn, 1);
  assert.equal(by.get(3)!.lost, 1);
});

test("goal difference and goals scored", () => {
  const t = computeStandings([1, 2], [fx(1, 2, 4, 1), fx(2, 1, 2, 2)]);
  const one = t.find((r) => r.clubId === 1)!;
  assert.equal(one.goalsFor, 6);
  assert.equal(one.goalsAgainst, 3);
  assert.equal(one.goalDifference, 3);
  assert.equal(one.home.goalsFor, 4);
  assert.equal(one.away.goalsFor, 2);
  assert.equal(one.home.points + one.away.points, one.points);
});

test("tie-breakers: points > GD > GF", () => {
  // 1 and 2 both 3 pts, 1 better GD. 3 and 4 both 3 pts, same GD, 4 more goals.
  const fixtures = [fx(1, 5, 3, 0), fx(2, 5, 1, 0), fx(3, 6, 1, 0), fx(4, 6, 2, 1)];
  const t = computeStandings([1, 2, 3, 4, 5, 6], fixtures);
  const order = t.map((r) => r.clubId);
  assert.ok(order.indexOf(1) < order.indexOf(2), "GD decides");
  assert.ok(order.indexOf(4) < order.indexOf(3), "goals scored decides");
});

test("tie-breakers: head-to-head then away goals, else flagged", () => {
  // 1 beats 2; 2 beats 3 by same margins so pts/GD/GF level for 1 & 2 overall
  const fixtures = [fx(1, 2, 1, 0), fx(2, 3, 1, 0), fx(3, 1, 1, 0)];
  const t = computeStandings([1, 2, 3], fixtures, (id) => `Club ${id}`);
  // All 3 pts, GD 0, GF 1: H2H mini-league among all three is identical → still level
  assert.ok(t.every((r) => r.points === 3));
  // away goals in H2H: 1 scored 0 away, 2 scored 0 away, 3 scored 0 away → all flagged
  assert.ok(t.every((r) => r.unresolvedTie));

  const fixtures2 = [fx(10, 11, 1, 2), fx(12, 10, 0, 1), fx(11, 12, 0, 1)];
  // 10: L(H 1-2) W(A 1-0) = 3 pts GF2 GA2; 11: W(A 2-1) L(H 0-1) = 3pts GF2 GA2; 12: L, W(A1-0) = 3pts GF1...
  const t2 = computeStandings([10, 11, 12], fixtures2);
  const r10 = t2.find((r) => r.clubId === 10)!;
  const r11 = t2.find((r) => r.clubId === 11)!;
  assert.equal(r10.points, r11.points);
  assert.equal(r10.goalDifference, r11.goalDifference);
  assert.equal(r10.goalsFor, r11.goalsFor);
});

test("postponed / scheduled / cancelled fixtures don't count", () => {
  const t = computeStandings(
    [1, 2],
    [fx(1, 2, null, null, "postponed"), fx(2, 1, null, null, "scheduled"), fx(1, 2, 3, 0, "cancelled")],
  );
  assert.ok(t.every((r) => r.played === 0 && r.points === 0));
});

test("completed-match update changes the table", () => {
  const before = computeStandings([1, 2], [fx(1, 2, null, null, "scheduled")]);
  assert.equal(before[0].points, 0);
  const after = computeStandings([1, 2], [{ ...fx(1, 2, 0, 2), status: "finished" }]);
  assert.equal(after[0].clubId, 2);
  assert.equal(after[0].points, 3);
});

test("form keeps the last five, most recent last", () => {
  const f = [1, 2, 3, 4, 5, 6].map((d) => fx(1, 2, d % 2 ? 1 : 0, 0, "finished", d));
  const t = computeStandings([1, 2], f);
  const one = t.find((r) => r.clubId === 1)!;
  assert.deepEqual(one.form, ["D", "W", "D", "W", "D"]);
  assert.equal(pointsInLast(one), 9);
});

// ---- league-sized synthetic season for the model ----
function syntheticLeague(n = 20) {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const all: Fixture[] = [];
  let day = 1;
  for (const h of ids) for (const a of ids) if (h !== a) all.push(fx(h, a, null, null, "scheduled", (day++ % 200) + 1));
  return { ids, all };
}

test("Poisson match probabilities sum to 1 and favour stronger side", () => {
  const p = matchProbabilities(2.0, 0.8);
  assert.ok(Math.abs(p.home + p.draw + p.away - 1) < 1e-9);
  assert.ok(p.home > p.away);
});

test("ratings recover stronger team", () => {
  const ids = [1, 2, 3, 4];
  const f: Fixture[] = [];
  for (let k = 0; k < 6; k++) {
    f.push(fx(1, 2, 3, 0), fx(1, 3, 2, 0), fx(1, 4, 3, 1), fx(2, 1, 0, 2), fx(3, 1, 0, 1), fx(4, 1, 1, 3));
    f.push(fx(2, 3, 1, 1), fx(3, 4, 1, 1), fx(4, 2, 1, 1));
  }
  const m = fitRatings(ids, f, [], { now: new Date(Date.UTC(2026, 7, 2)) });
  const one = m.ratings.get(1)!;
  for (const id of [2, 3, 4]) assert.ok(one.attack > m.ratings.get(id)!.attack);
  const xg = expectedGoals(m, 1, 2);
  assert.ok(xg.home > xg.away);
});

test("Monte Carlo: probabilities are consistent across all 20 clubs", () => {
  const { ids, all } = syntheticLeague();
  // Play first 100 fixtures with a deterministic pattern: lower id tends to win
  const played = all.slice(0, 100).map((f) => ({
    ...f,
    status: "finished" as const,
    homeGoals: f.homeId < f.awayId ? 2 : 1,
    awayGoals: f.homeId < f.awayId ? 0 : 1,
  }));
  const remaining = all.slice(100);
  const table = computeStandings(ids, played);
  const model = fitRatings(ids, played, [], { now: new Date(Date.UTC(2026, 11, 1)) });
  const N = 20_000;
  const res = simulateSeason(table, remaining, model, { simulations: N, seed: 42 });

  assert.equal(res.clubs.length, 20);
  assert.equal(res.fixturesRemaining, remaining.length);
  // each club's position distribution sums to 1
  for (const c of res.clubs) {
    const s = c.positionProbs.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 1) < 1e-9, `club ${c.clubId} sums to ${s}`);
    assert.ok(Math.abs(c.pRelegation + c.pSurvival - 1) < 1e-12);
    assert.ok(Math.abs(c.p18 + c.p19 + c.p20 - c.pRelegation) < 1e-9);
    assert.ok(c.pTop4 <= c.pTop6 && c.pTop6 <= c.pTop10);
  }
  // each position is filled exactly once per simulated season
  for (let p = 0; p < 20; p++) {
    const s = res.clubs.reduce((a, c) => a + c.positionProbs[p], 0);
    assert.ok(Math.abs(s - 1) < 1e-9, `position ${p + 1} sums to ${s}`);
  }
  // exactly 3 relegated and one champion on aggregate
  const rel = res.clubs.reduce((a, c) => a + c.pRelegation, 0);
  assert.ok(Math.abs(rel - 3) < 1e-9);
  assert.ok(Math.abs(res.clubs.reduce((a, c) => a + c.pTitle, 0) - 1) < 1e-9);
  // expected points never below current points
  for (const c of res.clubs) {
    const cur = table.find((r) => r.clubId === c.clubId)!.points;
    assert.ok(c.expectedPoints >= cur);
  }
  // stronger early side (club 1) more likely to win the league than club 20
  const one = res.clubs.find((c) => c.clubId === 1)!;
  const twenty = res.clubs.find((c) => c.clubId === 20)!;
  assert.ok(one.pTitle > twenty.pTitle);
  assert.ok(twenty.pRelegation > one.pRelegation);
});

test("Monte Carlo is reproducible with a seed and handles a finished season", () => {
  const { ids, all } = syntheticLeague(6);
  const played = all.map((f) => ({ ...f, status: "finished" as const, homeGoals: 1, awayGoals: f.homeId === 1 ? 0 : 1 }));
  const table = computeStandings(ids, played);
  const model = fitRatings(ids, played);
  const a = simulateSeason(table, [], model, { simulations: 1000, seed: 7 });
  const b = simulateSeason(table, [], model, { simulations: 1000, seed: 7 });
  assert.deepEqual(a.clubs.map((c) => c.positionProbs), b.clubs.map((c) => c.positionProbs));
  // Season over: club 1 has most points → finishes 1st with certainty
  assert.equal(a.clubs.find((c) => c.clubId === 1)!.pTitle, 1);
});

test("50,000 simulations run in reasonable time", () => {
  const { ids, all } = syntheticLeague();
  const played = all.slice(0, 90).map((f) => ({ ...f, status: "finished" as const, homeGoals: 1, awayGoals: 1 }));
  const table = computeStandings(ids, played);
  const model = fitRatings(ids, played);
  const res = simulateSeason(table, all.slice(90), model, { simulations: 50_000 });
  assert.equal(res.simulations, 50_000);
  assert.ok(res.durationMs < 30_000, `took ${res.durationMs}ms`);
  console.log(`  50k sims × ${res.fixturesRemaining} fixtures in ${res.durationMs}ms`);
});

test("margin of error shrinks with simulations", () => {
  assert.ok(marginOfError(0.5, 50_000) < 0.005);
  assert.ok(marginOfError(0.5, 1_000) > marginOfError(0.5, 50_000));
});

test("mathematical safety threshold", () => {
  // 4-team league, 1 relegated, 6 games each, all played 4.
  const rows = computeStandings(
    [1, 2, 3, 4],
    [fx(1, 2, 1, 0), fx(1, 3, 1, 0), fx(1, 4, 1, 0), fx(2, 3, 1, 0), fx(2, 4, 1, 0), fx(3, 4, 1, 0), fx(2, 1, 0, 1), fx(3, 1, 0, 1)],
  );
  const s = safetyThreshold(rows, 4, 6, 1)!;
  assert.ok(s);
  // allowedAbove = 4-1-1 = 2 others may reach target; third highest max + 1
  assert.equal(s.gamesRemaining, 6 - rows.find((r) => r.clubId === 4)!.played);
  assert.ok(s.target > 0);
  const top = safetyThreshold(rows, 1, 6, 1)!;
  assert.equal(top.safe, true);
});

test("north-east score is 0-100 and favours the better side", () => {
  const t = computeStandings([1, 2], [fx(1, 2, 3, 0), fx(2, 1, 0, 2)]);
  const a = t.find((r) => r.clubId === 1)!;
  const b = t.find((r) => r.clubId === 2)!;
  const s = northEastScore({ row: a }, { row: b });
  assert.equal(s.scoreA + s.scoreB, 100);
  assert.ok(s.scoreA > 50);
});
