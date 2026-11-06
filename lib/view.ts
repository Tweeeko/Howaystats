import "server-only";
import type { Snapshot } from "./database/queries";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "./football/provider";
import { computeStandings, countsTowardsTable } from "./football/standings";
import { gloryMeter, mackemVerdict, northEastScore, safetyThreshold } from "./predictions/safety";
import { dangerLevel, happiness, miseryEvents, miseryIndexAt, miseryLabel, tearJar, watchDistances } from "./misery/index";
import type { Fixture } from "./types";
import { tearsIndex, tearsLabel } from "./tears/index";

export const pct = (p: number | undefined, dp = 0) => (p === undefined ? "—" : `${(p * 100).toFixed(dp)}%`);
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

/** Everything the Misery department needs, computed from real fixtures + model output. */
export function miseryView(s: Snapshot) {
  const sun = s.sunderland;
  if (!sun) return null;
  const ids = s.table.map((r) => r.clubId);
  const pSun = s.predictions.get(SUNDERLAND_ID);
  const events = miseryEvents({
    clubIds: ids,
    fixtures: s.fixtures,
    cupFixtures: s.cupFixtures,
    sunderlandId: SUNDERLAND_ID,
    newcastleId: NEWCASTLE_ID,
    nameOf: (id) => clubName(s, id),
  });
  const state = { pRelegation: pSun?.pRelegation ?? 0, position: sun.position, leagueSize: s.table.length };
  const now = new Date();
  // Prefer the stored snapshot (it includes model-history and news inputs); fall back to live computation.
  const live = miseryIndexAt(events, state, now);
  // Snapshot (includes verified-news events) wins when present; the live calculation is the fallback.
  const score = s.misery?.miseryIndex ?? live.score;
  const parts = (s.misery?.payload as { parts?: typeof live.parts } | undefined)?.parts ?? live.parts;
  const weekAgoSnap = [...s.miseryWeek].reverse().find((m) => Date.parse(m.takenAt) <= now.getTime() - 6.5 * 86_400_000);
  const prevState = { ...state, pRelegation: s.previousPredictions.get(SUNDERLAND_ID)?.pRelegation ?? state.pRelegation };
  const weekAgo = weekAgoSnap?.miseryIndex ?? miseryIndexAt(events, prevState, new Date(now.getTime() - 7 * 86_400_000)).score;
  const recent = events.filter((e) => Date.parse(e.at) >= now.getTime() - 7 * 86_400_000 && e.misery !== 0);
  const biggest = s.misery?.biggestEvent ?? [...recent].sort((a, b) => Math.abs(b.misery) - Math.abs(a.misery))[0]?.label ?? null;
  const jar = tearJar(s.fixtures, SUNDERLAND_ID, (id) => clubName(s, id), 2 * (s.table.length - 1));
  const spark = [...s.miseryWeek].reverse().map((m) => ({ at: m.takenAt, v: m.miseryIndex }));
  // Why the jar moved last time: the result, plus anything else that game triggered, plus the odds change.
  const lastId = jar.history[0]?.fixtureId;
  const extras = events
    .filter((e) => e.fixtureId === lastId && /^(heavy|streak|six|zone-in|zone-out|drop)-/.test(e.key))
    .map((e) => e.label);
  const prevP = s.previousPredictions.get(SUNDERLAND_ID)?.pRelegation;
  const oddsMove = pSun && prevP !== undefined ? Math.round((pSun.pRelegation - prevP) * 100) : 0;
  // Why the Tears Index moved: the latest result (any competition), what it triggered, and the odds shift.
  const tears = tearsIndex({
    leagueFixtures: s.fixtures,
    cupFixtures: s.cupFixtures,
    sunderlandId: SUNDERLAND_ID,
    newcastleId: NEWCASTLE_ID,
    nameOf: (id) => clubName(s, id),
    totalGames: 2 * (s.table.length - 1),
  });
  const jarReasons = [
    ...(tears.latest ? [tears.latest] : []),
    ...extras,
    ...(oddsMove ? [`Relegation odds ${oddsMove > 0 ? "up" : "down"} ${Math.abs(oddsMove)} points`] : []),
  ];
  const nufc = s.newcastle;
  const pNufc = s.predictions.get(NEWCASTLE_ID);

  return {
    tears: { ...tears, label: tearsLabel(tears.percent) },
    jarReasons,
    oddsMove,
    score,
    parts,
    label: miseryLabel(score),
    movement: score - weekAgo,
    biggest,
    jar,
    spark,
    danger: dangerLevel(state.pRelegation, sun.position, s.table.length),
    verdict: pSun ? mackemVerdict(pSun.pRelegation, pSun.projectedPosition) : null,
    happiness: nufc ? happiness(nufc, pNufc?.pTop6 ?? 0, pNufc?.pRelegation ?? 0) : null,
    hasModel: !!pSun,
  };
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
  if (c.safety.relegated) return "Mathematically relegated. Confirmed by the table.";
  if (c.safety.safe) return "Mathematically safe. We checked twice. Gutted.";
  if (c.safety.target <= c.safety.maxPossible && c.remaining <= 10) return `${c.safety.target - c.row.points} more points guarantees safety.`;
  const need = Math.max(0, 38 - c.row.points);
  if (need === 0) return "Past the 38-point mark. Annoying.";
  return `${need} more points to reach 38, the usual survival mark — ${(need / Math.max(1, c.remaining)).toFixed(2)} a game from here.`;
}
