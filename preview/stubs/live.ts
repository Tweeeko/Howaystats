export async function buildLivePayload() { return { fetchedAt: new Date().toISOString(), source: "database", fixtures: [] }; }
export async function maybeRefreshLive() { return false; }
