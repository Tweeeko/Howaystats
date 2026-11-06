import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixture } from "../lib/types";
import { tearsIndex, tearsLabel } from "../lib/tears/index";
import { voiceCheck } from "../lib/content/voice-check";

const SUN = 71, NEW = 67;
let id = 1;
const f = (h: number, a: number, hg: number, ag: number, day: number, extra: Partial<Fixture> = {}): Fixture => ({
  id: id++, season: 2026, round: null, kickoff: new Date(Date.UTC(2026, 8, day)).toISOString(),
  status: "finished", statusShort: "FT", elapsed: null, homeId: h, awayId: a, homeGoals: hg, awayGoals: ag, htHome: null, htAway: null,
  ...extra,
});

test("tears index: bounded, unavailable indicators left out, misery raises it", () => {
  const good = [f(SUN, 1, 2, 0, 1), f(2, SUN, 0, 1, 8), f(SUN, NEW, 1, 0, 15)];
  const bad = [f(SUN, 1, 0, 3, 1), f(2, SUN, 2, 0, 8), f(NEW, SUN, 3, 0, 15), f(SUN, 3, 1, 2, 22, { htHome: 1, htAway: 0 })];
  const g = tearsIndex({ leagueFixtures: good, sunderlandId: SUN, newcastleId: NEW, totalGames: 38 });
  const b = tearsIndex({ leagueFixtures: bad, sunderlandId: SUN, newcastleId: NEW, totalGames: 38 });
  for (const t of [g, b]) {
    assert.ok(t.percent >= 0 && t.percent <= 100);
    assert.equal(t.tears, Math.round(t.percent * 1000));
    const away = t.indicators.find((i) => i.key === "away")!;
    assert.equal(away.available, false);
    assert.equal(away.score, 0);
    assert.equal(t.available, t.indicators.filter((i) => i.available).length);
  }
  assert.ok(b.percent > g.percent, "losing the derby and everything else should hurt more");
  assert.equal(b.indicators.find((i) => i.key === "derbies")!.value.length > 0, true);
});

test("tears index: attendance only counts when the provider supplied it", () => {
  const none = tearsIndex({ leagueFixtures: [f(SUN, 1, 0, 1, 1)], sunderlandId: SUN, newcastleId: NEW });
  assert.equal(none.indicators.find((i) => i.key === "last-gate")!.available, false);
  const some = tearsIndex({ leagueFixtures: [f(SUN, 1, 0, 1, 1, { attendance: 39_200 })], sunderlandId: SUN, newcastleId: NEW });
  const gate = some.indicators.find((i) => i.key === "last-gate")!;
  assert.equal(gate.available, true);
  assert.ok(gate.score > 0);
});

test("tears index: every indicator line passes the voice check", () => {
  const t = tearsIndex({ leagueFixtures: [f(SUN, 1, 0, 3, 1), f(NEW, SUN, 2, 0, 8)], sunderlandId: SUN, newcastleId: NEW });
  for (const i of t.indicators) assert.equal(voiceCheck(i.line).ok, true, `${i.key}: ${i.line} → ${voiceCheck(i.line).reason}`);
  assert.equal(typeof tearsLabel(0), "string");
  assert.equal(typeof tearsLabel(100), "string");
});
