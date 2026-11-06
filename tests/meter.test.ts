import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixture } from "../lib/types";
import { mackemMeter } from "../lib/meter";
import { feedImage } from "../lib/news/rss";
import { voiceCheck } from "../lib/content/voice-check";

const SUN = 71, NEW = 67;
let id = 1;
const f = (h: number, a: number, hg: number, ag: number, day: number, extra: Partial<Fixture> = {}): Fixture => ({
  id: id++, season: 2026, round: null, kickoff: new Date(Date.UTC(2026, 8, day)).toISOString(),
  status: "finished", statusShort: "FT", elapsed: null, homeId: h, awayId: a, homeGoals: hg, awayGoals: ag, htHome: null, htAway: null,
  ...extra,
});

test("meter: a bad run lights up, a good run doesn't", () => {
  const bad = [f(SUN, 1, 0, 3, 1), f(2, SUN, 2, 0, 8), f(NEW, SUN, 3, 0, 15), f(SUN, 3, 1, 2, 22), f(4, SUN, 2, 1, 29)];
  const good = [f(SUN, 1, 2, 0, 1), f(2, SUN, 0, 1, 8), f(SUN, NEW, 1, 0, 15), f(SUN, 3, 2, 1, 22), f(4, SUN, 0, 0, 29)];
  const b = mackemMeter({ fixtures: bad, sunderlandId: SUN, newcastleId: NEW, position: 19, leagueSize: 20 });
  const g = mackemMeter({ fixtures: good, sunderlandId: SUN, newcastleId: NEW, position: 6, leagueSize: 20 });
  assert.equal(b.bad, b.total, "every sign should be bad");
  assert.equal(b.level, 4);
  assert.equal(g.bad, 0);
  assert.equal(g.level, 0);
  assert.deepEqual(b.form, ["L", "L", "L", "L", "L"]);
});

test("meter: signs we can't measure are left out, not guessed", () => {
  const m = mackemMeter({ fixtures: [f(SUN, 1, 1, 1, 1)], sunderlandId: SUN, newcastleId: NEW, position: 12, leagueSize: 20 });
  const keys = m.signs.map((s) => s.key);
  assert.ok(!keys.includes("derby"), "no derby played");
  assert.ok(!keys.includes("crowd"), "no attendance supplied");
  assert.ok(!keys.includes("run"), "no losing run");
  const withGate = mackemMeter({ fixtures: [f(SUN, 1, 0, 1, 1, { attendance: 39_000 })], sunderlandId: SUN, newcastleId: NEW, position: 12, leagueSize: 20 });
  assert.equal(withGate.signs.find((s) => s.key === "crowd")?.bad, true);
});

test("meter: no games means no verdict invented", () => {
  const m = mackemMeter({ fixtures: [], sunderlandId: SUN, newcastleId: NEW, position: null, leagueSize: 20 });
  assert.equal(m.total, 0);
  assert.equal(m.signs.length, 0);
});

test("meter: every line it can say passes the voice check and names the right river", () => {
  const cases = [
    mackemMeter({ fixtures: [f(SUN, 1, 0, 3, 1), f(2, SUN, 2, 0, 8), f(NEW, SUN, 3, 0, 15), f(SUN, 3, 1, 2, 22), f(4, SUN, 2, 1, 29, { attendance: 40_000 })], sunderlandId: SUN, newcastleId: NEW, position: 20, leagueSize: 20 }),
    mackemMeter({ fixtures: [f(SUN, 1, 2, 0, 1), f(SUN, NEW, 2, 1, 8)], sunderlandId: SUN, newcastleId: NEW, position: 3, leagueSize: 20 }),
  ];
  for (const m of cases) {
    for (const t of [m.verdict, m.summary, m.levelName, ...m.signs.map((s) => s.line)]) {
      assert.equal(voiceCheck(t).ok, true, `${t}: ${voiceCheck(t).reason}`);
      assert.ok(!/\bTyne\b/.test(t) || /Newcastle|us|we/i.test(t), `Sunderland line mentions the Tyne: ${t}`);
    }
  }
});

test("rss: picks the biggest feed image and upsizes BBC thumbnails", () => {
  const bbc = `<item><title>x</title><media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/abc.jpg"/></item>`;
  assert.equal(feedImage(bbc), "https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/abc.jpg");
  const guardian = `<item><media:content width="140" url="https://i.guim.co.uk/a.jpg?width=140&amp;s=1"/><media:content width="460" url="https://i.guim.co.uk/a.jpg?width=460&amp;s=2"/></item>`;
  assert.equal(feedImage(guardian), "https://i.guim.co.uk/a.jpg?width=460&s=2");
  assert.equal(feedImage(`<item><enclosure url="http://insecure/x.jpg" type="image/jpeg"/></item>`), null);
  assert.equal(feedImage(`<item><title>no image</title></item>`), null);
});

test("voice check: swearing allowed, but not for the sake of it", () => {
  assert.equal(voiceCheck("They've won a football match, not the fucking World Cup.").ok, true);
  assert.equal(voiceCheck("Shite. Absolute shite. Fucking shite.").ok, false);
  assert.equal(voiceCheck("In a surprising turn of events, Sunderland won.").ok, false);
});

import { classifyStory } from "../lib/news/classify";
test("news: tragedies, children and crime are never turned into banter", () => {
  for (const h of ["Boy arrested following Bradley Lowery taunt", "Newcastle's Dedic stopped by police after being spotted with bow and arrows", "Tributes paid after former Sunderland player dies"]) {
    assert.equal(classifyStory(h).category, null, h);
  }
  assert.equal(classifyStory("Europa League: Sunderland lose at home to Zagreb").storyType, "loss");
  assert.notEqual(classifyStory("Sakamoto sparks Coventry win to keep 10-man Sunderland rock-bottom").category, null);
});
