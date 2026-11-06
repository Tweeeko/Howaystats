import "server-only";
/**
 * Football data supplier switch. FOOTBALL_API_PROVIDER = "football-data" (default) or "api-football".
 * Both adapters expose the same functions, so nothing else in the app cares which one is live.
 */
import * as fd from "./football-data";
import * as af from "./api-football";
import { PROVIDER } from "./ids";

export { NEWCASTLE_ID, SUNDERLAND_ID, PREMIER_LEAGUE_ID, PROVIDER, ProviderError, currentSeason } from "./ids";

const p = PROVIDER === "api-football" ? af : fd;

export const fetchTeams = p.fetchTeams;
export const fetchFixtures = p.fetchFixtures;
export const fetchLiveFixtures = p.fetchLiveFixtures;
export const fetchFixtureById = p.fetchFixtureById;
export const fetchEvents = p.fetchEvents;
export const fetchProviderStandings = p.fetchProviderStandings;
export const fetchTeamFixtures = p.fetchTeamFixtures;
export type { ApiEvent } from "./api-football";
