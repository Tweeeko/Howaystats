import type { ClubPrediction, Fixture, RatingModel, SimulationResult, StandingRow } from "../types";
import { expectedGoals } from "./ratings";

/** Small, fast, seedable PRNG (mulberry32) so a model run is reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_GOALS = 12;

/** Cumulative Poisson table so sampling is a short linear scan. */
function poissonCdf(lambda: number): Float64Array {
  const cdf = new Float64Array(MAX_GOALS + 1);
  let p = Math.exp(-lambda);
  let acc = p;
  cdf[0] = acc;
  for (let k = 1; k <= MAX_GOALS; k++) {
    p *= lambda / k;
    acc += p;
    cdf[k] = acc;
  }
  cdf[MAX_GOALS] = 1; // fold the (tiny) tail into the last bucket
  return cdf;
}

function sample(cdf: Float64Array, u: number): number {
  let k = 0;
  while (u > cdf[k]) k++;
  return k;
}

/** Exact win/draw/loss probabilities for a fixture under independent Poisson goals. */
export function matchProbabilities(lambdaHome: number, lambdaAway: number) {
  const ph: number[] = [];
  const pa: number[] = [];
  let a = Math.exp(-lambdaHome), b = Math.exp(-lambdaAway);
  for (let k = 0; k <= MAX_GOALS; k++) {
    ph.push(a);
    pa.push(b);
    a *= lambdaHome / (k + 1);
    b *= lambdaAway / (k + 1);
  }
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i <= MAX_GOALS; i++)
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = ph[i] * pa[j];
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }
  const s = home + draw + away;
  return { home: home / s, draw: draw / s, away: away / s };
}

export interface LeagueRules {
  relegationPlaces: number; // bottom N go down (PL: 3)
}

export const PREMIER_LEAGUE: LeagueRules = { relegationPlaces: 3 };

export interface SimulateOptions {
  simulations?: number;
  seed?: number;
  rules?: LeagueRules;
}

/**
 * Simulate the rest of the season for ALL clubs at once.
 *
 * Every simulated season starts from the real current table (points, GD, goals),
 * plays every remaining fixture by sampling Poisson scorelines from the rating model,
 * then ranks the final table. Because all clubs are simulated together, every
 * season produces exactly one champion and exactly three relegated clubs, so
 * probabilities are mutually consistent (each position's probabilities sum to 1
 * across clubs, and each club's position probabilities sum to 1).
 *
 * Ties after points → GD → goals scored are broken at random in simulation
 * (head-to-head detail is ignored here; it affects well under 1% of outcomes).
 */
export function simulateSeason(
  table: StandingRow[],
  remaining: Fixture[],
  model: RatingModel,
  opts: SimulateOptions = {},
): SimulationResult {
  const started = Date.now();
  const N = opts.simulations ?? 50_000;
  const seed = opts.seed ?? 20260801;
  const rules = opts.rules ?? PREMIER_LEAGUE;
  const rng = mulberry32(seed);

  const n = table.length;
  const index = new Map<number, number>();
  table.forEach((r, i) => index.set(r.clubId, i));

  const basePts = new Int32Array(n);
  const baseGd = new Int32Array(n);
  const baseGf = new Int32Array(n);
  table.forEach((r, i) => {
    basePts[i] = r.points;
    baseGd[i] = r.goalDifference;
    baseGf[i] = r.goalsFor;
  });

  const fx = remaining
    .filter((f) => index.has(f.homeId) && index.has(f.awayId))
    .map((f) => {
      const xg = expectedGoals(model, f.homeId, f.awayId);
      return {
        h: index.get(f.homeId)!,
        a: index.get(f.awayId)!,
        ch: poissonCdf(xg.home),
        ca: poissonCdf(xg.away),
        xg,
      };
    });

  const posCounts = Array.from({ length: n }, () => new Float64Array(n));
  const maxPts = 3 * 2 * (n - 1) + 1;
  const ptsHist = Array.from({ length: n }, () => new Float64Array(maxPts + 1));
  const ptsSum = new Float64Array(n);

  const pts = new Int32Array(n);
  const gd = new Int32Array(n);
  const gf = new Int32Array(n);
  const order = Array.from({ length: n }, (_, i) => i);
  const key = new Float64Array(n);

  for (let s = 0; s < N; s++) {
    pts.set(basePts);
    gd.set(baseGd);
    gf.set(baseGf);
    for (let k = 0; k < fx.length; k++) {
      const m = fx[k];
      const hg = sample(m.ch, rng());
      const ag = sample(m.ca, rng());
      gf[m.h] += hg;
      gf[m.a] += ag;
      gd[m.h] += hg - ag;
      gd[m.a] += ag - hg;
      if (hg > ag) pts[m.h] += 3;
      else if (hg < ag) pts[m.a] += 3;
      else {
        pts[m.h] += 1;
        pts[m.a] += 1;
      }
    }
    for (let i = 0; i < n; i++) {
      // Lexicographic key: points ≫ GD ≫ GF ≫ random tie-break.
      key[i] = pts[i] * 1e7 + (gd[i] + 500) * 1e4 + gf[i] * 10 + rng();
      ptsSum[i] += pts[i];
      ptsHist[i][Math.min(maxPts, Math.max(0, pts[i]))] += 1;
    }
    order.sort((x, y) => key[y] - key[x]);
    for (let p = 0; p < n; p++) posCounts[order[p]][p] += 1;
  }

  // Remaining-fixture difficulty: 1 − (expected points per game / 3) using exact match probabilities.
  const xPts = new Float64Array(n);
  const games = new Int32Array(n);
  for (const m of fx) {
    const pr = matchProbabilities(m.xg.home, m.xg.away);
    xPts[m.h] += 3 * pr.home + pr.draw;
    xPts[m.a] += 3 * pr.away + pr.draw;
    games[m.h]++;
    games[m.a]++;
  }

  const relStart = n - rules.relegationPlaces; // zero-based first relegation position
  const clubs: ClubPrediction[] = table.map((r, i) => {
    const probs = Array.from(posCounts[i], (c) => c / N);
    const sumRange = (from: number, to: number) => probs.slice(from, to).reduce((a, b) => a + b, 0);
    const pRelegation = sumRange(relStart, n);
    let modal = 0;
    probs.forEach((p, k) => {
      if (p > probs[modal]) modal = k;
    });
    return {
      clubId: r.clubId,
      expectedPoints: ptsSum[i] / N,
      expectedPosition: probs.reduce((acc, p, k) => acc + p * (k + 1), 0),
      positionProbs: probs,
      pTitle: probs[0],
      pTop4: sumRange(0, 4),
      pTop5: sumRange(0, 5),
      pTop6: sumRange(0, 6),
      pTop7: sumRange(0, 7),
      pTop10: sumRange(0, 10),
      pRelegation,
      pSurvival: 1 - pRelegation,
      p18: probs[n - 3] ?? 0,
      p19: probs[n - 2] ?? 0,
      p20: probs[n - 1] ?? 0,
      projectedPosition: modal + 1,
      medianPoints: percentile(ptsHist[i], N, 0.5),
      pointsP10: percentile(ptsHist[i], N, 0.1),
      pointsP90: percentile(ptsHist[i], N, 0.9),
      fixtureDifficulty: games[i] ? 1 - xPts[i] / (3 * games[i]) : 0,
      remaining: games[i],
    };
  });

  return {
    simulations: N,
    seed,
    fixturesRemaining: fx.length,
    durationMs: Date.now() - started,
    homeAdvantage: model.homeAdvantage,
    clubs,
  };
}

function percentile(hist: Float64Array, total: number, q: number): number {
  let acc = 0;
  for (let k = 0; k < hist.length; k++) {
    acc += hist[k];
    if (acc / total >= q) return k;
  }
  return hist.length - 1;
}

/** 95% Monte Carlo margin of error for a simulated probability. */
export function marginOfError(p: number, n: number): number {
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

/**
 * Overall model confidence label. Early in the season ratings rest heavily on priors,
 * so we say so rather than pretending to precision.
 */
export function modelConfidence(gamesPlayedAvg: number, totalGames = 38) {
  const share = gamesPlayedAvg / totalGames;
  if (share < 0.15) return { level: "low" as const, note: "Early season — ratings still lean on last season and priors." };
  if (share < 0.45) return { level: "medium" as const, note: "Enough games for a decent read, but plenty can still change." };
  return { level: "high" as const, note: "Large sample of this season's results." };
}
