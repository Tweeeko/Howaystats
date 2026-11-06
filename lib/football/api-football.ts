import "server-only";
import type { Club, Fixture, FixtureStatus } from "../types";
import { env } from "../env";

/**
 * API-Football (api-sports.io) v3 adapter.
 * Docs: https://www.api-football.com/documentation-v3
 * Premier League = league 39. Season is the starting year (2026 = 2026/27).
 * Free plan: 100 requests/day — the refresh strategy in /api/cron/* stays well inside that.
 */

const BASE = "https://v3.football.api-sports.io";
import { NEWCASTLE_ID, PREMIER_LEAGUE_ID, SUNDERLAND_ID } from "./ids";

import { ProviderError } from "./ids";

const STATUS_MAP: Record<string, FixtureStatus> = {
  TBD: "scheduled", NS: "scheduled",
  "1H": "live", "2H": "live", ET: "live", BT: "live", P: "live", LIVE: "live", INT: "live",
  HT: "halftime",
  FT: "finished", AET: "finished", PEN: "finished", AWD: "finished", WO: "finished",
  PST: "postponed",
  CANC: "cancelled", ABD: "cancelled",
  SUSP: "suspended",
};

export function mapStatus(short: string): FixtureStatus {
  return STATUS_MAP[short] ?? "scheduled";
}

async function call<T>(path: string, params: Record<string, string | number>, revalidate = 0, attempt = 1): Promise<T> {
  const key = env.footballApiKey();
  if (!key) throw new ProviderError("FOOTBALL_API_KEY is not configured");
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "x-apisports-key": key },
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      return call<T>(path, params, revalidate, attempt + 1);
    }
  }
  if (!res.ok) throw new ProviderError(`API-Football ${path} → HTTP ${res.status}`, res.status);
  const json = (await res.json()) as { errors?: unknown; response: T };
  const errs = json.errors;
  if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs as object).length)) {
    throw new ProviderError(`API-Football ${path} error: ${JSON.stringify(errs)}`);
  }
  return json.response;
}

interface ApiFixture {
  fixture: { id: number; date: string; venue?: { name?: string | null }; status: { short: string; elapsed: number | null } };
  league: { id: number; season: number; round: string; name?: string };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: { home: number | null; away: number | null };
  score: { halftime: { home: number | null; away: number | null } };
}
interface ApiTeam { id: number; name: string; logo: string; code?: string | null }

export function mapFixture(f: ApiFixture): Fixture {
  return {
    id: f.fixture.id,
    season: f.league.season,
    round: f.league.round ?? null,
    kickoff: new Date(f.fixture.date).toISOString(),
    status: mapStatus(f.fixture.status.short),
    statusShort: f.fixture.status.short,
    elapsed: f.fixture.status.elapsed,
    homeId: f.teams.home.id,
    awayId: f.teams.away.id,
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
    htHome: f.score.halftime.home,
    htAway: f.score.halftime.away,
    venue: f.fixture.venue?.name ?? null,
    leagueId: f.league.id,
    competition: f.league.name ?? null,
  };
}

/** Teams appearing in a fixture payload (European/cup opponents aren't in the PL team list). */
export function teamsFromFixtures(rows: ApiFixture[]): Club[] {
  const out = new Map<number, Club>();
  for (const r of rows) for (const t of [r.teams.home, r.teams.away]) {
    if (!out.has(t.id)) out.set(t.id, { id: t.id, name: t.name, shortName: SHORT[t.id] ?? t.name.replace(/ (FC|AFC)$/, ""), code: (t.code ?? t.name.slice(0, 3)).toUpperCase(), slug: `${slugify(t.name)}-${t.id}`, logoUrl: t.logo });
  }
  return [...out.values()];
}

/** Every fixture for one club this season, in ALL competitions (league, Europe, cups). */
export async function fetchTeamFixtures(teamId: number, season: number) {
  const rows = await call<ApiFixture[]>("/fixtures", { team: teamId, season });
  return { fixtures: rows.map(mapFixture), teams: teamsFromFixtures(rows) };
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SHORT: Record<number, string> = { 34: "Newcastle", 746: "Sunderland", 33: "Man Utd", 50: "Man City", 47: "Spurs", 65: "Nott'm Forest", 48: "West Ham", 39: "Wolves", 51: "Brighton" };

export async function fetchTeams(season: number): Promise<Club[]> {
  const rows = await call<{ team: ApiTeam }[]>("/teams", { league: PREMIER_LEAGUE_ID, season }, 86_400);
  return rows.map(({ team }) => ({
    id: team.id,
    name: team.name,
    shortName: SHORT[team.id] ?? team.name.replace(/ (FC|AFC)$/, ""),
    code: (team.code ?? team.name.slice(0, 3)).toUpperCase(),
    slug: slugify(team.name),
    logoUrl: team.logo,
  }));
}

export async function fetchFixtures(season: number): Promise<Fixture[]> {
  const rows = await call<ApiFixture[]>("/fixtures", { league: PREMIER_LEAGUE_ID, season });
  return rows.map(mapFixture);
}

export async function fetchLiveFixtures(): Promise<Fixture[]> {
  // One call for every live game anywhere; keep Premier League games plus any Newcastle/Sunderland game.
  const rows = await call<ApiFixture[]>("/fixtures", { live: "all" });
  return rows
    .filter((r) => r.league.id === PREMIER_LEAGUE_ID || [r.teams.home.id, r.teams.away.id].some((id) => id === NEWCASTLE_ID || id === SUNDERLAND_ID))
    .map(mapFixture);
}

export async function fetchFixtureById(id: number): Promise<Fixture | null> {
  const rows = await call<ApiFixture[]>("/fixtures", { id });
  return rows[0] ? mapFixture(rows[0]) : null;
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number };
  player: { name: string | null };
  assist: { name: string | null };
  type: string;
  detail: string;
}
export async function fetchEvents(fixtureId: number): Promise<ApiEvent[]> {
  return call<ApiEvent[]>("/fixtures/events", { fixture: fixtureId });
}

/** Provider's own table — used only to VERIFY our computed table, never as a substitute. */
export async function fetchProviderStandings(season: number) {
  const rows = await call<{ league: { standings: { team: { id: number }; rank: number; points: number; goalsDiff: number; all: { played: number } }[][] } }[]>(
    "/standings",
    { league: PREMIER_LEAGUE_ID, season },
  );
  return rows[0]?.league.standings[0] ?? [];
}

