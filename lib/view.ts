import "server-only";
import type { Snapshot } from "./database/queries";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "./football/provider";
import { computeStandings, countsTowardsTable } from "./football/standings";
import { gloryMeter, mackemVerdict, northEastScore, safetyThreshold } from "./predictions/safety";
import { watchDistances } from "./misery/index";
import { mackemMeter } from "./meter";
import type { Fixture } from "./types";

export const pct = (p: number | undefined, dp = 0) => (p === undefined ? "" : `${(p * 100).toFixed(dp)}%`);
export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function clubName(s: Snapshot, id: number, short = true) {
  const c = s.clubs.get(id);
  return c ? (short ? c.shortName : c.name) : `#${id}`;
}

/** A club's games in every competition (league + Europe + cups), for results and fixture lists. */
export function clubFixtures(s: Snapshot, id: number) {
  const mine = [...s.fixtures, ...s.cupFixtures].filter((f) => f.homeId === id || f.awayId === id);
  return {
    recent: mine.filter(countsTowardsTable).sort((a, b) => b.kickoff.localeCompare(a.kickoff)),
    upcoming: mine
      .filter((f) => f.status === "scheduled" || f.status === "postponed" || f.status === "live" || f.status === "halftime")
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
  };
}

/** Per-fixture difficulty from the opponent's modelled strength (expected finish), for display. */
export function opponentDifficulty(s: Snapshot, f: Fixture, clubId: number) {
  const opp = f.homeId === clubId ? f.awayId : f.homeId;
  const p = s.predictions.get(opp);
  if (!p) return null;
  // Expected finish 1 → 5 (hardest), 20 → 1 (easiest); away games one notch harder.
  const base = 5 - ((p.expectedPosition - 1) / (s.table.length - 1 || 19)) * 4;
  return Math.max(1, Math.min(5, Math.round(base + (f.awayId === clubId ? 0.4 : -0.2))));
}

export function clubView(s: Snapshot, id: number) {
  const row = s.table.find((r) => r.clubId === id);
  if (!row) return null;
  const pred = s.predictions.get(id);
  const prev = s.previousPredictions.get(id);
  const totalGames = 2 * (s.table.length - 1);
  return {
    id,
    name: clubName(s, id, false),
    short: clubName(s, id),
    row,
    pred,
    prev,
    fixtures: clubFixtures(s, id),
    remaining: totalGames - row.played,
    totalGames,
    safety: safetyThreshold(s.table, id, totalGames),
    distances: watchDistances(s.table, id, s.table.length),
  };
}

/** The Mackem Misery Meter for the current snapshot (all competitions). */
export function meterView(s: Snapshot) {
  if (!s.sunderland) return null;
  return mackemMeter({
    fixtures: [...s.fixtures, ...s.cupFixtures],
    sunderlandId: SUNDERLAND_ID,
    newcastleId: NEWCASTLE_ID,
    position: s.sunderland.position,
    leagueSize: s.table.length,
  });
}

export function tyneView(s: Snapshot) {
  const n = s.newcastle;
  const u = s.sunderland;
  if (!n || !u) return null;
  const pn = s.predictions.get(NEWCASTLE_ID);
  const pu = s.predictions.get(SUNDERLAND_ID);
  return {
    score: northEastScore({ row: n, expectedPosition: pn?.expectedPosition }, { row: u, expectedPosition: pu?.expectedPosition }, s.table.length),
    n,
    u,
    pn,
    pu,
  };
}

export function gloryView(s: Snapshot) {
  const p = s.predictions.get(NEWCASTLE_ID);
  return p ? gloryMeter(p) : null;
}

export function liveTracked(s: Snapshot) {
  return s.fixtures.filter(
    (f) => (f.status === "live" || f.status === "halftime") && [f.homeId, f.awayId].some((x) => x === NEWCASTLE_ID || x === SUNDERLAND_ID),
  );
}

/** Freshness: "live" only if the live job succeeded in the last 3 minutes. */
export function freshness(s: Snapshot) {
  const football = s.status["football"]?.lastSuccessAt ?? null;
  const live = s.status["live"]?.lastSuccessAt ?? null;
  const latest = [football, live].filter(Boolean).sort().pop() ?? null;
  const ageMin = latest ? (Date.now() - Date.parse(latest)) / 60_000 : Infinity;
  return {
    latest,
    isLive: !!live && Date.now() - Date.parse(live) < 3 * 60_000,
    stale: ageMin > 36 * 60,
    ageMin,
  };
}

/** Places moved since the previous matchday (positive = climbed). */
export function tableMovement(s: Snapshot) {
  const done = s.fixtures.filter(countsTowardsTable).sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const out = new Map<number, number>();
  if (!done.length) return out;
  const cutoff = Date.parse(done[0].kickoff) - 4 * 86_400_000;
  const before = computeStandings(s.table.map((r) => r.clubId), s.fixtures.filter((f) => Date.parse(f.kickoff) < cutoff));
  if (!before.some((r) => r.played > 0)) return out;
  for (const r of s.table) {
    const b = before.find((x) => x.clubId === r.clubId);
    if (b) out.set(r.clubId, b.position - r.position);
  }
  return out;
}

/** Head-to-head between two clubs across the fixtures supplied (all stored seasons when available). */
export function headToHead(fixtures: Fixture[], a: number, b: number) {
  const games = fixtures
    .filter(countsTowardsTable)
    .filter((f) => (f.homeId === a && f.awayId === b) || (f.homeId === b && f.awayId === a))
    .sort((x, y) => y.kickoff.localeCompare(x.kickoff));
  let aw = 0, d = 0, bw = 0;
  for (const f of games) {
    const ag = f.homeId === a ? f.homeGoals! : f.awayGoals!;
    const bg = f.homeId === a ? f.awayGoals! : f.homeGoals!;
    if (ag > bg) aw++;
    else if (ag === bg) d++;
    else bw++;
  }
  return { aWins: aw, draws: d, bWins: bw, games };
}

/** Plain-English survival maths. Early on, the guaranteed figure is meaninglessly high, so use the 38-point mark. */
export function safetyLine(c: { row: { points: number }; remaining: number; safety: { relegated: boolean; safe: boolean; target: number; maxPossible: number } | null }) {
  if (!c.safety) return "";
  if (c.safety.relegated) return "Mathematically relegated. Ta-ra, ya sad Mackem bastards. HAHAHA.";
  if (c.safety.safe) return "Mathematically safe. We checked twice. Fucking gutted.";
  if (c.safety.target <= c.safety.maxPossible && c.remaining <= 10) return `${c.safety.target - c.row.points} more points guarantees safety.`;
  const need = Math.max(0, 38 - c.row.points);
  if (need === 0) return "Already past 38 points. Fucking annoying.";
  return `They need ${need} more points to reach 38, the usual survival mark. That's ${(need / Math.max(1, c.remaining)).toFixed(1)} a game. Good luck with that, lads. HAHAHA.`;
}

/** Real numbers for the Sunderland roast banner (league games only for wins). */
export function roastFacts(s: Snapshot) {
  const sun = clubView(s, SUNDERLAND_ID);
  const nufc = clubView(s, NEWCASTLE_ID);
  if (!sun || !nufc) return null;
  const r = (f: Fixture) => {
    const home = f.homeId === SUNDERLAND_ID;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    return { r: (gf > ga ? "W" : gf === ga ? "D" : "L") as "W" | "D" | "L", gf, ga, opp: clubName(s, home ? f.awayId : f.homeId) };
  };
  const last = sun.fixtures.recent[0];
  const lastWin = sun.fixtures.recent.filter((f) => (f.leagueId ?? 39) === 39).find((f) => r(f).r === "W");
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
  return {
    position: sun.row.position,
    leagueSize: s.table.length,
    points: sun.row.points,
    won: sun.row.won,
    played: sun.row.played,
    daysSinceWin: lastWin ? Math.floor((Date.now() - Date.parse(lastWin.kickoff)) / 86_400_000) : null,
    lastWinAgainst: lastWin ? `${r(lastWin).opp}, ${day(lastWin.kickoff)}` : null,
    lastResult: last ? r(last) : null,
    belowUs: nufc.row.position < sun.row.position,
    gapToUs: nufc.row.points - sun.row.points,
    lastScore: last ? scoreLine(s, last) : null,
  };
}

/** "COV 3 - 1 SUN", for the scoreboards in the illustrations. */
export function scoreLine(s: Snapshot, f: Fixture) {
  const code = (id: number) => (s.clubs.get(id)?.code || clubName(s, id).slice(0, 3)).toUpperCase();
  return `${code(f.homeId)} ${f.homeGoals} - ${f.awayGoals} ${code(f.awayId)}`;
}

/** Real numbers for the Toon hero. */
export function toonFacts(s: Snapshot) {
  const nufc = clubView(s, NEWCASTLE_ID);
  const sun = clubView(s, SUNDERLAND_ID);
  if (!nufc) return null;
  const last = nufc.fixtures.recent[0];
  const next = nufc.fixtures.upcoming[0];
  const name = (id: number) => clubName(s, id);
  const when = (iso: string) =>
    `${new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" })}, ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;
  let lastResult = null as null | { r: "W" | "D" | "L"; gf: number; ga: number; opp: string; home: boolean };
  if (last) {
    const home = last.homeId === NEWCASTLE_ID;
    const gf = home ? last.homeGoals! : last.awayGoals!;
    const ga = home ? last.awayGoals! : last.homeGoals!;
    lastResult = { r: gf > ga ? "W" : gf === ga ? "D" : "L", gf, ga, opp: name(home ? last.awayId : last.homeId), home };
  }
  return {
    position: nufc.row.position,
    leagueSize: s.table.length,
    points: nufc.row.points,
    played: nufc.row.played,
    form: nufc.row.form as ("W" | "D" | "L")[],
    pEurope: nufc.pred?.pTop7,
    pTop4: nufc.pred?.pTop4,
    lastResult,
    next: next ? `${next.homeId === NEWCASTLE_ID ? name(next.awayId) : name(next.homeId)} (${next.homeId === NEWCASTLE_ID ? "H" : "A"}), ${when(next.kickoff)}${(next.leagueId ?? 39) !== 39 && next.competition ? ` · ${next.competition}` : ""}` : null,
    aboveSunderlandBy: sun && nufc.row.position < sun.row.position ? nufc.row.points - sun.row.points : sun ? null : null,
    won: nufc.row.won,
    goalsFor: nufc.row.goalsFor,
    sunPoints: sun?.row.points ?? null,
    sunWon: sun?.row.won ?? null,
    lastScore: last ? scoreLine(s, last) : null,
  };
}
