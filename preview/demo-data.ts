/**
 * DESIGN PREVIEW DATA — simulated sample results so the real engine (table, ratings, 50k Monte Carlo,
 * misery model) can be exercised end to end. These are NOT real scores and never ship to the site.
 */
import type { Club, Fixture } from "../lib/types";
import { computeStandings, countsTowardsTable } from "../lib/football/standings";
import { fitRatings } from "../lib/predictions/ratings";
import { simulateSeason, mulberry32 } from "../lib/predictions/montecarlo";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "../lib/football/provider";

const names: [number, string, string, number][] = [
  [42, "Arsenal", "ARS", 0.55], [50, "Man City", "MCI", 0.5], [40, "Liverpool", "LIV", 0.45], [49, "Chelsea", "CHE", 0.35],
  [NEWCASTLE_ID, "Newcastle", "NEW", 0.3], [66, "Aston Villa", "AVL", 0.2], [47, "Spurs", "TOT", 0.15], [51, "Brighton", "BHA", 0.1],
  [33, "Man Utd", "MUN", 0.1], [55, "Brentford", "BRE", 0.0], [45, "Everton", "EVE", 0.0], [36, "Fulham", "FUL", -0.05],
  [35, "Bournemouth", "BOU", -0.05], [63, "Leeds", "LEE", -0.1], [52, "Crystal Palace", "CRY", -0.15], [65, "Nott'm Forest", "NFO", -0.15],
  [57, "Ipswich", "IPS", -0.25], [1346, "Coventry", "COV", -0.25], [64, "Hull City", "HUL", -0.3], [SUNDERLAND_ID, "Sunderland", "SUN", -0.4],
];

export function demoData() {
  const clubs = new Map<number, Club>(names.map(([id, n, code]) => [id, { id, name: n === "Newcastle" ? "Newcastle United" : n === "Sunderland" ? "Sunderland AFC" : n, shortName: n, code, slug: n.toLowerCase(), logoUrl: null }]));
  const strength = new Map(names.map(([id, , , s]) => [id, s]));
  const ids = names.map((n) => n[0]);
  const rng = mulberry32(1892);
  const pois = (l: number) => { let k = 0, p = Math.exp(-l), s = p; const u = rng(); while (u > s) { k++; p *= l / k; s += p; } return k; };
  // Circle-method double round robin
  const rounds: [number, number][][] = [];
  const arr = [...ids];
  for (let r = 0; r < 19; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < 10; i++) pairs.push(r % 2 ? [arr[i], arr[19 - i]] : [arr[19 - i], arr[i]]);
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  rounds.push(...rounds.map((p) => p.map(([h, a]) => [a, h] as [number, number])));
  const start = Date.UTC(2026, 7, 22);
  let id = 1000;
  const fixtures: Fixture[] = rounds.flatMap((pairs, r) =>
    pairs.map(([h, a]) => {
      const kickoff = new Date(start + r * 7 * 86_400_000 + 15 * 3600_000).toISOString();
      const played = r < 10;
      const hg = played ? pois(Math.exp(0.3 + 0.22 + strength.get(h)! - strength.get(a)! * 0.8)) : null;
      const ag = played ? pois(Math.exp(0.3 + strength.get(a)! - strength.get(h)! * 0.8)) : null;
      return { id: id++, season: 2026, round: `Regular Season - ${r + 1}`, kickoff, status: played ? "finished" : "scheduled", statusShort: played ? "FT" : "NS", elapsed: null, homeId: h, awayId: a, homeGoals: hg, awayGoals: ag, htHome: null, htAway: null } as Fixture;
    }),
  );
  const nameOf = (i: number) => clubs.get(i)!.name;
  const table = computeStandings(ids, fixtures, nameOf);
  const prevTable = computeStandings(ids, fixtures.filter((f) => !f.round?.endsWith(" 10")), nameOf);
  const model = fitRatings(ids, fixtures, [], { now: new Date(start + 10 * 7 * 86_400_000) });
  const remaining = fixtures.filter((f) => !countsTowardsTable(f));
  const sim = simulateSeason(table, remaining, model, { simulations: 50_000, seed: 7 });
  const prevSim = simulateSeason(prevTable, fixtures.filter((f) => !countsTowardsTable(f) || f.round?.endsWith(" 10")), fitRatings(ids, fixtures.filter((f) => !f.round?.endsWith(" 10")), []), { simulations: 20_000, seed: 8 });
  return { clubs, fixtures, table, sim, prevSim };
}
