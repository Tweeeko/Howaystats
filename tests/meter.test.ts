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

test("voice check: catches the slop that actually got published", () => {
  for (const t of [
    "Looks like Sunderland have taken a howay into another embarrassing defeat.",
    "Fans are left wondering if they ever know what winning feels like, a real pet mystery.",
    "BOTTOM CLUB SUNDERS STICK WITH LE BRIS",
    "Fans will be watching to see if anything actually changes.",
  ]) assert.equal(voiceCheck(t).ok, false, t);
  for (const t of ["Howay the lads.", "Rooted to the bottom. Get comfy.", "Meanwhile, wor lot", "They wanted European nights. Be careful what you wish for, lads."])
    assert.equal(voiceCheck(t).ok, true, `${t}: ${voiceCheck(t).reason}`);
  assert.equal(classifyStory("Sunderland fan thinks Regis Le Bris deserves more time").category, null);
  assert.equal(classifyStory("Newcastle United 0-1 Everton: Premier League – as it happened").category, null);
});

import { roastCopy, roastHeat } from "../components/roast";
test("roast: volume follows the real table", () => {
  const base = { leagueSize: 20, points: 5, won: 1, played: 9, daysSinceWin: 68, lastWinAgainst: "Fulham", belowUs: true, gapToUs: 6 };
  const L = { r: "L" as const, gf: 1, ga: 3, opp: "Coventry" };
  const W = { r: "W" as const, gf: 2, ga: 0, opp: "Fulham" };
  assert.equal(roastHeat({ ...base, position: 20, lastResult: L }), 4);
  assert.equal(roastHeat({ ...base, position: 18, lastResult: W }), 3);
  assert.equal(roastHeat({ ...base, position: 14, lastResult: W }), 2);
  assert.equal(roastHeat({ ...base, position: 8, lastResult: W }), 1);
  assert.equal(roastHeat({ ...base, position: 5, lastResult: W, belowUs: false }), 0);
  assert.equal(roastCopy({ ...base, position: 5, lastResult: W, belowUs: false }).laugh, null, "no laughing when they're above us");
  assert.match(roastCopy({ ...base, position: 12, lastResult: W }).big, /12th/, "always shows the live position");
});

import { toonCopy, toonMood } from "../components/toon";
test("toon: every result is glorious, every number is real", () => {
  const base = { leagueSize: 20, points: 11, played: 9, form: ["W", "L", "L", "W", "L"] as ("W" | "D" | "L")[], next: null, aboveSunderlandBy: 6, won: 3, goalsFor: 12, sunPoints: 5, sunWon: 1, position: 13 };
  const lostByOne = toonCopy({ ...base, lastResult: { r: "L", gf: 0, ga: 1, opp: "Everton", home: true } });
  assert.equal(lostByOne.head, "Only lost by one");
  assert.match(lostByOne.sub, /Got beat 1-0 by Everton/);
  assert.match(lostByOne.sub, /still better than them Mackems/);
  assert.equal(lostByOne.badge, "Top of the North East");
  assert.equal(toonCopy({ ...base, lastResult: { r: "L", gf: 0, ga: 4, opp: "Leeds", home: false } }).head, "Character building");
  assert.equal(toonCopy({ ...base, lastResult: { r: "D", gf: 2, ga: 2, opp: "Bournemouth", home: true } }).head, "Unbeaten. Again.");
  assert.equal(toonCopy({ ...base, lastResult: { r: "W", gf: 2, ga: 0, opp: "Palace", home: false } }).head, "Toon win. Obviously.");
  assert.equal(toonCopy({ ...base, aboveSunderlandBy: null, lastResult: null }).badge, "Temporary blip");
  assert.equal(toonCopy({ ...base, lastResult: null, pEurope: 0.02 }).stamp, "Next year");
  assert.equal(toonCopy({ ...base, lastResult: null }).stamp, "Pending", "no model yet = pending, not a guess");
  for (const r of ["W", "D", "L"] as const) {
    const c = toonCopy({ ...base, lastResult: { r, gf: 1, ga: 2, opp: "X", home: true } });
    assert.ok(!/shite|rubbish|awful/i.test(c.head + c.sub), "never slags the Toon off");
  }
});

import { makeAdminToken, verifyAdminToken } from "../lib/admin-session";
import { tractionScore } from "../lib/memes/rank";
test("admin: signed cookie works, wrong secret or expiry fails", async () => {
  const t = await makeAdminToken("correct horse");
  assert.equal(await verifyAdminToken(t, "correct horse"), true);
  assert.equal(await verifyAdminToken(t, "wrong"), false);
  assert.equal(await verifyAdminToken(t.replace(/.$/, "0"), "correct horse"), t.endsWith("0") ? true : false);
  assert.equal(await verifyAdminToken(t, "correct horse", Date.now() + 31 * 86_400_000), false);
  assert.equal(await verifyAdminToken(undefined, "x"), false);
});
test("memes: trending and top-ranked beat old and buried", () => {
  const hot = tractionScore({ club: true, rank: 0, trendedAt: Date.now() - 3 * 86_400_000, ageDays: 10 });
  const buried = tractionScore({ club: true, rank: 45, trendedAt: NaN, ageDays: 2000 });
  const generic = tractionScore({ club: false, rank: 0, trendedAt: Date.now() - 3 * 86_400_000, ageDays: 10 });
  assert.ok(hot > buried && hot > generic);
});

import { HANDOVER_LINES, handoverLine } from "../components/handover";
test("handover: every line passes the voice check, defeats still big us up", () => {
  for (const h of [...HANDOVER_LINES.any, ...HANDOVER_LINES.afterDefeat, ...HANDOVER_LINES.afterWin]) {
    for (const t of [h.kicker, h.line]) assert.equal(voiceCheck(t).ok, true, `${t}: ${voiceCheck(t).reason}`);
  }
  const days = Array.from({ length: 10 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
  assert.ok(new Set(days.map((d) => handoverLine(d, null).line)).size > 3, "rotates day to day");
});
