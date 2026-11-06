// Shared domain types for HOWAYSTATS.
// Everything here is provider-agnostic: provider adapters map into these shapes.

export type FixtureStatus =
  | "scheduled" // not started (NS / TBD)
  | "live" // 1H, 2H, ET, P, BT, LIVE, INT
  | "halftime" // HT
  | "finished" // FT, AET, PEN, AWD, WO
  | "postponed" // PST
  | "cancelled" // CANC, ABD
  | "suspended"; // SUSP

export interface Club {
  id: number; // provider team id
  name: string;
  shortName: string;
  code: string; // three-letter code, e.g. NEW
  slug: string;
  logoUrl?: string | null;
}

export interface Fixture {
  id: number; // provider fixture id
  season: number;
  round: string | null;
  kickoff: string; // ISO timestamp
  status: FixtureStatus;
  statusShort: string; // raw provider status code
  elapsed: number | null;
  homeId: number;
  awayId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  htHome: number | null;
  htAway: number | null;
  venue?: string | null;
  /** Provider competition id (39 = Premier League). Missing = Premier League. */
  leagueId?: number;
  /** Competition name for display, e.g. "UEFA Europa League", "FA Cup". */
  competition?: string | null;
  /** Official attendance, when the data supplier provides it. Never estimated. */
  attendance?: number | null;
}

export interface Split {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export type FormResult = "W" | "D" | "L";

export interface StandingRow extends Split {
  clubId: number;
  position: number;
  goalDifference: number;
  form: FormResult[]; // most recent LAST, max 5
  home: Split;
  away: Split;
  /** true when the row is level with a neighbour on every tie-breaker we can compute (play-off territory) */
  unresolvedTie: boolean;
}

export interface TeamRating {
  clubId: number;
  attack: number; // log-scale multiplier, 0 = league average
  defence: number; // log-scale, positive = concedes more than average
}

export interface RatingModel {
  ratings: Map<number, TeamRating>;
  homeAdvantage: number; // log-scale
  baseRate: number; // log of league-average goals per team per match
  matchesUsed: number;
}

export interface ClubPrediction {
  clubId: number;
  expectedPoints: number;
  expectedPosition: number;
  /** positionProbs[i] = P(finish in position i+1) */
  positionProbs: number[];
  pTitle: number;
  pTop4: number;
  pTop5: number;
  pTop6: number;
  pTop7: number;
  pTop10: number;
  pRelegation: number;
  pSurvival: number;
  p18: number;
  p19: number;
  p20: number;
  projectedPosition: number; // modal (most likely) position
  medianPoints: number;
  pointsP10: number;
  pointsP90: number;
  fixtureDifficulty: number; // 0..1, higher = harder
  remaining: number;
}

export interface SimulationResult {
  simulations: number;
  seed: number;
  fixturesRemaining: number;
  durationMs: number;
  homeAdvantage: number;
  clubs: ClubPrediction[];
}
