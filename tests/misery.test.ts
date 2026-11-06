import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixture } from "../lib/types";
import { miseryEvents, miseryIndexAt, tearJar, dangerLevel, miseryLabel, watchDistances, happiness } from "../lib/misery/index";
import { computeStandings } from "../lib/football/standings";

const SUN = 746, NEW = 34;
const ids = [SUN, NEW, 1, 2, 3, 4];
let id = 1;
const f = (h: number, a: number, hg: number, ag: number, day: number): Fixture => ({
  id: id++, season: 2026, round: null, kickoff: new Date(Date.UTC(2026, 8, day)).toISOString(),
  status: "finished", statusShort: "FT", elapsed: null, homeId: h, awayId: a, homeGoals: hg, awayGoals: ag, htHome: null, htAway: null,
});

const season = [f(SUN, 1, 0, 3, 1), f(NEW, 2, 2, 0, 1), f(2, SUN, 1, 0, 8), f(3, 4, 1, 1, 8), f(SUN, 3, 2, 1, 15)];

test("events: one per rule per fixture, recomputation never double counts", () => {
  const e1 = miseryEvents({ clubIds: ids, fixtures: season, sunderlandId: SUN, newcastleId: NEW, relegationPlaces: 1 });
  const e2 = miseryEvents({ clubIds: ids, fixtures: [...season, ...season], sunderlandId: SUN, newcastleId: NEW, relegationPlaces: 1 });
  assert.equal(new Set(e1.map((e) => e.key)).size, e1.length);
  assert.equal(e2.length, e1.length, "duplicated fixtures must not add events");
  const keys = e1.map((e) => e.key.split("-")[0]);
  assert.ok(keys.includes("loss") && keys.includes("heavy") && keys.includes("streak") && keys.includes("win") && keys.includes("rival"));
});

test("misery index bounded 0..100, wins reduce it", () => {
  const ev = miseryEvents({ clubIds: ids, fixtures: season.slice(0, 3), sunderlandId: SUN, newcastleId: NEW });
  const at = new Date(Date.UTC(2026, 8, 9));
  const bad = miseryIndexAt(ev, { pRelegation: 0.9, position: 6, leagueSize: 6 }, at);
  const evWin = miseryEvents({ clubIds: ids, fixtures: season, sunderlandId: SUN, newcastleId: NEW });
  const better = miseryIndexAt(evWin, { pRelegation: 0.9, position: 6, leagueSize: 6 }, new Date(Date.UTC(2026, 8, 15, 18)));
  assert.ok(bad.score >= 0 && bad.score <= 100);
  assert.ok(better.score < bad.score);
  assert.equal(miseryIndexAt([], { pRelegation: 1, position: 20, leagueSize: 20 }, at).score, 60);
});

test("labels and danger levels follow the documented bands", () => {
  assert.equal(miseryLabel(10), "Mackems having a lovely time.");
  assert.equal(miseryLabel(65), "Wearside meltdown.");
  assert.equal(miseryLabel(100), "THE ENTIRE JAR HAS GONE.");
  assert.equal(dangerLevel(0.05, 10), "Comfortable");
  assert.equal(dangerLevel(0.05, 19), "Danger Zone");
  assert.equal(dangerLevel(0.7, 19), "Championship Bound");
  assert.equal(dangerLevel(0.95, 20), "Absolute Panic");
});

test("tear jar: points dropped out of 76, game by game", () => {
  const jar = tearJar(season, SUN, (id) => `Club ${id}`, 38);
  // SUN: lost 0-3 (3 in), lost 0-1 (3 in), won 2-1 (0 in) => 6 dropped
  assert.equal(jar.capacity, 76);
  assert.equal(jar.dropped, 6);
  assert.equal(jar.percent, Math.round((1000 * 6) / 76) / 10);
  assert.equal(jar.history.length, 3);
  assert.deepEqual(jar.history.map((h) => h.added), [0, 3, 3]); // most recent first
  assert.equal(jar.last?.added, 0);
  assert.ok(!jar.overflowed);
  const losses = Array.from({ length: 26 }, (_, i) => f(SUN, 1, 0, 1, 1 + (i % 28)));
  const full = tearJar(losses, SUN, undefined, 38);
  assert.equal(full.dropped, 78);
  assert.ok(full.overflowed && full.percent === 100);
  assert.deepEqual(full.milestones, [25, 50, 75, 100]);
});

test("misery parts add up to the score", () => {
  const ev = miseryEvents({ clubIds: ids, fixtures: season, sunderlandId: SUN, newcastleId: NEW });
  const m = miseryIndexAt(ev, { pRelegation: 0.5, position: 5, leagueSize: 6 }, new Date(Date.UTC(2026, 8, 16)));
  assert.equal(Math.abs(m.parts.odds + m.parts.position + m.parts.results - m.score) <= 1, true);
});

test("watch distances and happiness meter", () => {
  const t = computeStandings(ids, season);
  const d = watchDistances(t, SUN, 6, 1)!;
  assert.equal(d.pointsDropped, 3 * 3 - 3);
  const h = happiness(t.find((r) => r.clubId === NEW)!, 0.5, 0.01);
  assert.ok(h.score > 50 && h.score <= 100);
});

test("European/cup defeats count in the Misery Index but never in the league jar", () => {
  const cup: Fixture = { ...f(SUN, 999, 0, 2, 20), leagueId: 3, competition: "UEFA Europa League" };
  const withCup = miseryEvents({ clubIds: ids, fixtures: season, cupFixtures: [cup], sunderlandId: SUN, newcastleId: NEW });
  const e = withCup.find((x) => x.key === `cuploss-${cup.id}`);
  assert.ok(e && e.misery > 0 && e.label.includes("Europa League"));
  const jar = tearJar([...season, cup], SUN, undefined, 38);
  assert.equal(jar.dropped, 6, "the jar is league points only");
});
