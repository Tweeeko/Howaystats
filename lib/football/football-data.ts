import "server-only";
import type { Club, Fixture } from "../types";
import { env } from "../env";
import { NEWCASTLE_ID, ProviderError, SUNDERLAND_ID } from "./ids";
import { FD_PREMIER_LEAGUE, mapFdMatch, mapFdTeam, type FdMatch, type FdTeam } from "./football-data-map";

/**
 * football-data.org v4 adapter. Docs: https://www.football-data.org/documentation/quickstart
 * Free tier: Premier League (and 11 other competitions), 10 requests/minute, scores slightly delayed,
 * no Europa League. A full refresh here uses 5 requests.
 */
const BASE = "https://api.football-data.org/v4";

async function call<T>(path: string, params: Record<string, string | number> = {}, attempt = 1): Promise<T> {
  const key = env.footballApiKey();
  if (!key) throw new ProviderError("FOOTBALL_API_KEY is not configured");
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ""}`, { headers: { "X-Auth-Token": key }, cache: "no-store" });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    const wait = Number(res.headers.get("x-requestcounter-reset") ?? 0);
    await new Promise((r) => setTimeout(r, Math.min(12_000, Math.max(800, wait * 1000)) * attempt));
    return call<T>(path, params, attempt + 1);
  }
  if (!res.ok) {
    let msg = "";
    try {
      msg = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* ignore */
    }
    throw new ProviderError(`football-data.org ${path} → HTTP ${res.status}${msg ? `: ${msg}` : ""}`, res.status);
  }
  return (await res.json()) as T;
}

export async function fetchTeams(season: number): Promise<Club[]> {
  const r = await call<{ teams: FdTeam[] }>(`/competitions/${FD_PREMIER_LEAGUE}/teams`, { season });
  return r.teams.map((t) => mapFdTeam(t));
}

export async function fetchFixtures(season: number): Promise<Fixture[]> {
  const r = await call<{ matches: FdMatch[] }>(`/competitions/${FD_PREMIER_LEAGUE}/matches`, { season });
  return r.matches.map((m) => mapFdMatch(m, season));
}

/** Today's live/half-time games in subscribed competitions; keep PL plus anything involving our two clubs. */
export async function fetchLiveFixtures(): Promise<Fixture[]> {
  const r = await call<{ matches: FdMatch[] }>(`/matches`);
  return r.matches
    .filter((m) => ["IN_PLAY", "PAUSED", "LIVE"].includes(m.status))
    .filter((m) => m.competition?.id === FD_PREMIER_LEAGUE || [m.homeTeam.id, m.awayTeam.id].some((id) => id === NEWCASTLE_ID || id === SUNDERLAND_ID))
    .map((m) => mapFdMatch(m, new Date().getUTCFullYear()));
}

export async function fetchFixtureById(id: number): Promise<Fixture | null> {
  const m = await call<FdMatch>(`/matches/${id}`);
  return m?.id ? mapFdMatch(m, new Date().getUTCFullYear()) : null;
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number };
  player: { name: string | null };
  assist: { name: string | null };
  type: string;
  detail: string;
}

/** Goals and cards — only present if your football-data.org plan includes them; otherwise none (never invented). */
export async function fetchEvents(fixtureId: number): Promise<ApiEvent[]> {
  const m = await call<FdMatch>(`/matches/${fixtureId}`);
  const goals: ApiEvent[] = (m.goals ?? []).map((g) => ({
    time: { elapsed: g.minute, extra: g.injuryTime ?? null },
    team: { id: g.team.id },
    player: { name: g.scorer?.name ?? null },
    assist: { name: g.assist?.name ?? null },
    type: "Goal",
    detail: g.type === "OWN" ? "Own Goal" : g.type === "PENALTY" ? "Penalty" : "Normal Goal",
  }));
  const cards: ApiEvent[] = (m.bookings ?? []).map((b) => ({
    time: { elapsed: b.minute, extra: null },
    team: { id: b.team.id },
    player: { name: b.player?.name ?? null },
    assist: { name: null },
    type: "Card",
    detail: b.card === "RED" || b.card === "YELLOW_RED" ? "Red Card" : "Yellow Card",
  }));
  return [...goals, ...cards];
}

/** Provider table, in the same shape the verifier expects. Used only to CHECK our computed table. */
export async function fetchProviderStandings(season: number) {
  const r = await call<{ standings: { type: string; table: { position: number; team: { id: number }; playedGames: number; points: number; goalDifference: number }[] }[] }>(
    `/competitions/${FD_PREMIER_LEAGUE}/standings`,
    { season },
  );
  const total = r.standings.find((s) => s.type === "TOTAL") ?? r.standings[0];
  return (total?.table ?? []).map((t) => ({ team: { id: t.team.id }, rank: t.position, points: t.points, goalsDiff: t.goalDifference, all: { played: t.playedGames } }));
}

/** One club's games in every competition your plan covers (e.g. Champions League on free; not Europa League). */
export async function fetchTeamFixtures(teamId: number, season: number) {
  const r = await call<{ matches: FdMatch[] }>(`/teams/${teamId}/matches`, { season });
  const fixtures = r.matches.map((m) => mapFdMatch(m, season));
  const teams = new Map<number, Club>();
  for (const m of r.matches) for (const t of [m.homeTeam, m.awayTeam]) if (!teams.has(t.id)) teams.set(t.id, mapFdTeam(t, true));
  return { fixtures, teams: [...teams.values()] };
}
