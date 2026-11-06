/** Pure mapping from football-data.org v4 payloads to HOWAYSTATS types (no I/O, unit-tested). */
import type { Club, Fixture, FixtureStatus } from "../types";
import { PREMIER_LEAGUE_ID } from "./ids";

export const FD_PREMIER_LEAGUE = 2021;

export interface FdTeam { id: number; name: string; shortName?: string | null; tla?: string | null; crest?: string | null }
export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | string | null;
  matchday?: number | null;
  stage?: string | null;
  competition?: { id: number; name: string; code?: string };
  season?: { startDate?: string };
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null }; halfTime?: { home: number | null; away: number | null } };
  venue?: string | null;
  attendance?: number | null;
  goals?: { minute: number; injuryTime?: number | null; type?: string; team: { id: number }; scorer?: { name?: string } | null; assist?: { name?: string } | null }[];
  bookings?: { minute: number; team: { id: number }; player?: { name?: string } | null; card: string }[];
}

const STATUS: Record<string, FixtureStatus> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  LIVE: "live",
  PAUSED: "halftime",
  FINISHED: "finished",
  AWARDED: "finished",
  POSTPONED: "postponed",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
};

export const fdStatus = (s: string): FixtureStatus => STATUS[s] ?? "scheduled";

export function mapFdMatch(m: FdMatch, seasonFallback: number): Fixture {
  const compId = m.competition?.id ?? FD_PREMIER_LEAGUE;
  const status = fdStatus(m.status);
  const scored = status !== "scheduled" && status !== "postponed" && status !== "cancelled";
  const minute = m.minute == null ? null : Number(String(m.minute).replace(/\D/g, "")) || null;
  return {
    id: m.id,
    season: m.season?.startDate ? Number(m.season.startDate.slice(0, 4)) : seasonFallback,
    round: m.matchday ? `Regular Season - ${m.matchday}` : (m.stage ?? null),
    kickoff: new Date(m.utcDate).toISOString(),
    status,
    statusShort: m.status,
    elapsed: minute,
    homeId: m.homeTeam.id,
    awayId: m.awayTeam.id,
    homeGoals: scored ? m.score.fullTime.home : null,
    awayGoals: scored ? m.score.fullTime.away : null,
    htHome: m.score.halfTime?.home ?? null,
    htAway: m.score.halfTime?.away ?? null,
    venue: m.venue ?? null,
    leagueId: compId === FD_PREMIER_LEAGUE ? PREMIER_LEAGUE_ID : compId,
    competition: m.competition?.name ?? null,
    attendance: typeof m.attendance === "number" && m.attendance > 0 ? m.attendance : null,
  };
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function mapFdTeam(t: FdTeam, suffixId = false): Club {
  const short = (t.shortName ?? t.name).replace(/ (FC|AFC)$/, "");
  return {
    id: t.id,
    name: t.name.replace(/ FC$/, ""),
    shortName: short,
    code: (t.tla ?? short.slice(0, 3)).toUpperCase(),
    slug: suffixId ? `${slugify(t.name)}-${t.id}` : slugify(t.name),
    logoUrl: t.crest ?? null,
  };
}
