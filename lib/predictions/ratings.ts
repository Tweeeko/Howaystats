import type { Fixture, RatingModel, TeamRating } from "../types";
import { countsTowardsTable } from "../football/standings";

/**
 * Team-strength model (documented on /how-it-works).
 *
 * Each club i has an attack rating a_i and defence rating d_i (log scale).
 * Goals in a match are modelled as independent Poisson variables:
 *
 *   home goals ~ Poisson( exp(base + homeAdv + a_home + d_away) )
 *   away goals ~ Poisson( exp(base +           a_away + d_home) )
 *
 * Parameters are fitted by penalised maximum likelihood (Newton coordinate ascent):
 *   - every match is weighted by exp(-ln2 * ageDays / halfLifeDays), so recent form
 *     counts more than results from months ago;
 *   - previous-season matches can be passed in as `history` with a lower weight
 *     (historical performance);
 *   - a Gaussian prior pulls each rating towards `priors` (e.g. last season's
 *     final ratings, or 0 for promoted clubs), so a few early-season results cannot
 *     produce absurd ratings.
 */
export interface RatingOptions {
  now?: Date;
  halfLifeDays?: number;
  historyWeight?: number;
  priorStrength?: number; // precision of the Gaussian prior (1/σ²)
  priors?: Map<number, { attack: number; defence: number }>;
  iterations?: number;
}

interface Obs {
  scorer: number;
  conceder: number;
  isHome: boolean;
  goals: number;
  w: number;
}

export function fitRatings(
  clubIds: number[],
  fixtures: Fixture[],
  history: Fixture[] = [],
  opts: RatingOptions = {},
): RatingModel {
  const now = (opts.now ?? new Date()).getTime();
  const halfLife = opts.halfLifeDays ?? 120;
  const historyWeight = opts.historyWeight ?? 0.35;
  const tau = opts.priorStrength ?? 4;
  const iterations = opts.iterations ?? 60;
  const priors = opts.priors ?? new Map();
  const ids = new Set(clubIds);

  const obs: Obs[] = [];
  const push = (f: Fixture, scale: number) => {
    if (!countsTowardsTable(f)) return;
    // Only matches between clubs we know about contribute (promoted clubs' Championship
    // games are not comparable without a league-strength adjustment).
    if (!ids.has(f.homeId) || !ids.has(f.awayId)) return;
    const age = Math.max(0, (now - new Date(f.kickoff).getTime()) / 86_400_000);
    const w = scale * Math.exp((-Math.LN2 * age) / halfLife);
    obs.push({ scorer: f.homeId, conceder: f.awayId, isHome: true, goals: f.homeGoals!, w });
    obs.push({ scorer: f.awayId, conceder: f.homeId, isHome: false, goals: f.awayGoals!, w });
  };
  fixtures.forEach((f) => push(f, 1));
  history.forEach((f) => push(f, historyWeight));

  const att = new Map<number, number>();
  const def = new Map<number, number>();
  for (const id of clubIds) {
    att.set(id, priors.get(id)?.attack ?? 0);
    def.set(id, priors.get(id)?.defence ?? 0);
  }

  // Sensible defaults if there is no data at all: ~1.4 goals per team per game, mild home edge.
  const totalW = obs.reduce((s, o) => s + o.w, 0);
  const totalGoals = obs.reduce((s, o) => s + o.w * o.goals, 0);
  let base = totalW > 0 ? Math.log(Math.max(0.2, totalGoals / totalW)) : Math.log(1.4);
  let home = 0.2;

  const rate = (o: Obs) =>
    Math.exp(base + (o.isHome ? home : 0) + att.get(o.scorer)! + def.get(o.conceder)!);

  for (let it = 0; it < iterations && obs.length > 0; it++) {
    // base
    {
      let g = 0, h = 0;
      for (const o of obs) {
        const l = rate(o);
        g += o.w * (o.goals - l);
        h += o.w * l;
      }
      if (h > 0) base += g / h;
    }
    // home advantage (weak prior around 0.2 ≈ +22% scoring at home)
    {
      let g = -2 * (home - 0.2), h = 2;
      for (const o of obs) {
        if (!o.isHome) continue;
        const l = rate(o);
        g += o.w * (o.goals - l);
        h += o.w * l;
      }
      home += g / h;
    }
    for (const id of clubIds) {
      const pa = priors.get(id)?.attack ?? 0;
      const pd = priors.get(id)?.defence ?? 0;
      let ga = -tau * (att.get(id)! - pa), ha = tau;
      let gd = -tau * (def.get(id)! - pd), hd = tau;
      for (const o of obs) {
        if (o.scorer === id) {
          const l = rate(o);
          ga += o.w * (o.goals - l);
          ha += o.w * l;
        } else if (o.conceder === id) {
          const l = rate(o);
          gd += o.w * (o.goals - l);
          hd += o.w * l;
        }
      }
      att.set(id, att.get(id)! + ga / ha);
      def.set(id, def.get(id)! + gd / hd);
    }
    // Identifiability: centre ratings, absorb the mean into base.
    const meanA = mean([...att.values()]);
    const meanD = mean([...def.values()]);
    for (const id of clubIds) {
      att.set(id, att.get(id)! - meanA);
      def.set(id, def.get(id)! - meanD);
    }
    base += meanA + meanD;
  }

  const ratings = new Map<number, TeamRating>();
  for (const id of clubIds) ratings.set(id, { clubId: id, attack: att.get(id)!, defence: def.get(id)! });
  return { ratings, homeAdvantage: home, baseRate: base, matchesUsed: obs.length / 2 };
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Expected goals for a specific fixture under the model. */
export function expectedGoals(model: RatingModel, homeId: number, awayId: number) {
  const h = model.ratings.get(homeId);
  const a = model.ratings.get(awayId);
  if (!h || !a) throw new Error(`No rating for ${homeId} or ${awayId}`);
  return {
    home: Math.exp(model.baseRate + model.homeAdvantage + h.attack + a.defence),
    away: Math.exp(model.baseRate + a.attack + h.defence),
  };
}

/** Single-number strength (expected goal difference per game vs an average side, neutral venue). */
export function strengthIndex(r: TeamRating, base: number): number {
  return Math.exp(base + r.attack) - Math.exp(base + r.defence);
}
