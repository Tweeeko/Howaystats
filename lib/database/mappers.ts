import type { Club, Fixture, FormResult, StandingRow } from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const fixtureToRow = (f: Fixture) => ({
  id: f.id,
  season: f.season,
  round: f.round,
  kickoff: f.kickoff,
  status: f.status,
  status_short: f.statusShort,
  elapsed: f.elapsed,
  home_id: f.homeId,
  away_id: f.awayId,
  home_goals: f.homeGoals,
  away_goals: f.awayGoals,
  ht_home: f.htHome,
  ht_away: f.htAway,
  venue: f.venue ?? null,
  league_id: f.leagueId ?? 39,
  competition: f.competition ?? null,
  updated_at: new Date().toISOString(),
});

export const rowToFixture = (r: any): Fixture => ({
  id: Number(r.id),
  season: r.season,
  round: r.round,
  kickoff: r.kickoff,
  status: r.status,
  statusShort: r.status_short,
  elapsed: r.elapsed,
  homeId: r.home_id,
  awayId: r.away_id,
  homeGoals: r.home_goals,
  awayGoals: r.away_goals,
  htHome: r.ht_home,
  htAway: r.ht_away,
  venue: r.venue,
  leagueId: r.league_id ?? 39,
  competition: r.competition ?? null,
});

export const clubToRow = (c: Club) => ({
  id: c.id,
  name: c.name,
  short_name: c.shortName,
  code: c.code,
  slug: c.slug,
  logo_url: c.logoUrl ?? null,
  updated_at: new Date().toISOString(),
});

export const rowToClub = (r: any): Club => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name,
  code: r.code,
  slug: r.slug,
  logoUrl: r.logo_url,
});

export const standingToRow = (season: number, s: StandingRow) => ({
  season,
  club_id: s.clubId,
  position: s.position,
  played: s.played,
  won: s.won,
  drawn: s.drawn,
  lost: s.lost,
  goals_for: s.goalsFor,
  goals_against: s.goalsAgainst,
  goal_difference: s.goalDifference,
  points: s.points,
  form: s.form.join(""),
  home: s.home,
  away: s.away,
  unresolved_tie: s.unresolvedTie,
  computed_at: new Date().toISOString(),
});

export const rowToStanding = (r: any): StandingRow => ({
  clubId: r.club_id,
  position: r.position,
  played: r.played,
  won: r.won,
  drawn: r.drawn,
  lost: r.lost,
  goalsFor: r.goals_for,
  goalsAgainst: r.goals_against,
  goalDifference: r.goal_difference,
  points: r.points,
  form: (r.form ?? "").split("").filter(Boolean) as FormResult[],
  home: r.home,
  away: r.away,
  unresolvedTie: r.unresolved_tie,
});
