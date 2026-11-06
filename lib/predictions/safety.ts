import type { StandingRow } from "../types";
import { pointsInLast } from "../football/standings";

/**
 * Mathematical safety, computed conservatively.
 *
 * A club is mathematically safe on X points if at most (n − relegationPlaces − 1)
 * other clubs can still reach X. Equal points are treated as NOT safe (goal
 * difference could go against you). Because clubs who still play each other cannot
 * all win those games, the true threshold can be slightly lower — this figure is the
 * guaranteed one.
 */
export function safetyThreshold(
  table: StandingRow[],
  clubId: number,
  totalGames = 38,
  relegationPlaces = 3,
) {
  const n = table.length;
  const me = table.find((r) => r.clubId === clubId);
  if (!me) return null;
  const maxPossible = (r: StandingRow) => r.points + 3 * (totalGames - r.played);
  const others = table.filter((r) => r.clubId !== clubId);
  const maxes = others.map(maxPossible).sort((a, b) => b - a);
  const allowedAbove = n - relegationPlaces - 1; // 16 in a 20-team league
  const target = (maxes[allowedAbove] ?? -1) + 1;
  const myMax = maxPossible(me);
  // Relegated when at least (n - relegationPlaces) clubs already have MORE points than we can reach.
  const clubsOutOfReach = others.filter((r) => r.points > myMax).length;
  return {
    target,
    pointsNeeded: Math.max(0, target - me.points),
    gamesRemaining: totalGames - me.played,
    maxPossible: myMax,
    safe: me.points >= target,
    relegated: clubsOutOfReach >= n - relegationPlaces,
    achievable: myMax >= target,
  };
}

export interface ComparisonInput {
  row: StandingRow;
  expectedPosition?: number;
  pTop6?: number;
  pRelegation?: number;
}

/**
 * WHO OWNS THE NORTH EAST? — a 0–100 share computed only from real performance.
 * Weighted components (each scored head-to-head as a share of the combined total):
 *   35% points per game, 20% goal difference per game, 20% points from last five,
 *   15% league position, 10% projected final position.
 * Returns the share for A (B = 100 − A) plus each component so the UI can show working.
 */
export function northEastScore(a: ComparisonInput, b: ComparisonInput, leagueSize = 20) {
  const ppg = (r: StandingRow) => (r.played ? r.points / r.played : 0);
  const gdpg = (r: StandingRow) => (r.played ? r.goalDifference / r.played : 0);
  const share = (x: number, y: number) => (x + y === 0 ? 0.5 : x / (x + y));
  // Shift GD per game into positive territory (range ≈ −3..+3).
  const gdShift = (v: number) => Math.max(0, v + 3);
  const posScore = (p: number) => leagueSize + 1 - p;

  const components = [
    { key: "Points per game", weight: 0.35, a: ppg(a.row), b: ppg(b.row), s: share(ppg(a.row), ppg(b.row)) },
    {
      key: "Goal difference per game",
      weight: 0.2,
      a: gdpg(a.row),
      b: gdpg(b.row),
      s: share(gdShift(gdpg(a.row)), gdShift(gdpg(b.row))),
    },
    {
      key: "Points from last five",
      weight: 0.2,
      a: pointsInLast(a.row),
      b: pointsInLast(b.row),
      s: share(pointsInLast(a.row), pointsInLast(b.row)),
    },
    {
      key: "League position",
      weight: 0.15,
      a: a.row.position,
      b: b.row.position,
      s: share(posScore(a.row.position), posScore(b.row.position)),
    },
  ];
  if (a.expectedPosition !== undefined && b.expectedPosition !== undefined) {
    components.push({
      key: "Projected finish",
      weight: 0.1,
      a: a.expectedPosition,
      b: b.expectedPosition,
      s: share(posScore(a.expectedPosition), posScore(b.expectedPosition)),
    });
  }
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const scoreA = (100 * components.reduce((s, c) => s + c.weight * c.s, 0)) / totalWeight;
  return { scoreA: Math.round(scoreA), scoreB: 100 - Math.round(scoreA), components };
}

/** Geordie Glory Meter — banding is driven by model probabilities, never by hope. */
export function gloryMeter(p: { pTop4: number; pTop6: number; pTop10: number; pRelegation: number }) {
  if (p.pTop4 >= 0.5) return { level: 5, line: "Champions League dreams very much alive. The lads are cooking." };
  if (p.pTop6 >= 0.5) return { level: 4, line: "Europe is calling. Pack the passport, pet." };
  if (p.pTop10 >= 0.5) return { level: 3, line: "Top half, solid enough. Could be worse. Could be Sunderland." };
  if (p.pRelegation < 0.15) return { level: 2, line: "Mid-table mush. Howay, let's get some points on the board." };
  return { level: 1, line: "Squeaky bum time on Tyneside. Nobody panic. Well, panic a bit." };
}

/** Relegation Watch headline banding, again driven purely by the model. */
export function mackemVerdict(pRelegation: number, projected: number) {
  if (pRelegation >= 0.9) return "THE CHAMPIONSHIP HAS SENT THE FIXTURE LIST.";
  if (pRelegation >= 0.6) return "THE CHAMPIONSHIP IS CALLING.";
  if (pRelegation >= 0.35) return "WEARSIDE ON RED ALERT.";
  if (pRelegation >= 0.15) return "NERVY. VERY NERVY.";
  if (projected <= 10) return "TOP HALF?! SOMEBODY CHECK THE DATA. (WE DID. IT'S RIGHT.)";
  return "SAFE-ISH. FOR NOW. ENJOY IT WHILE IT LASTS.";
}
