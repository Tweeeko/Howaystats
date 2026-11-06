/**
 * Provider-specific identifiers. Club ids differ between data suppliers, so they're chosen from
 * FOOTBALL_API_PROVIDER (default: football-data). Override with NEWCASTLE_TEAM_ID / SUNDERLAND_TEAM_ID.
 * Internally the Premier League is always stored as league id 39, whatever the supplier calls it.
 */
export type ProviderName = "football-data" | "api-football";

export const PROVIDER: ProviderName =
  (process.env.FOOTBALL_API_PROVIDER ?? "").trim().toLowerCase() === "api-football" ? "api-football" : "football-data";

const DEFAULT_IDS: Record<ProviderName, { newcastle: number; sunderland: number }> = {
  "football-data": { newcastle: 67, sunderland: 71 },
  "api-football": { newcastle: 34, sunderland: 746 },
};

const envId = (k: string) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

export const NEWCASTLE_ID = envId("NEWCASTLE_TEAM_ID") ?? DEFAULT_IDS[PROVIDER].newcastle;
export const SUNDERLAND_ID = envId("SUNDERLAND_TEAM_ID") ?? DEFAULT_IDS[PROVIDER].sunderland;

/** Internal marker for "this is a Premier League fixture". */
export const PREMIER_LEAGUE_ID = 39;

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Seasons are named by their starting year (2026 = 2026/27) and roll over on 1 July. */
export function currentSeason(now = new Date()): number {
  const override = Number(process.env.FOOTBALL_SEASON);
  if (Number.isFinite(override) && override > 2000) return override;
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}
