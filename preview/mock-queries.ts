import { realData } from "./demo-data";
import { NEWS } from "./real-data";
import type { Snapshot } from "../lib/database/queries";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "../lib/football/provider";
export type * from "../lib/database/queries";

const d = realData();
const toPred = (c: any) => ({ ...c });

export async function getSnapshot(): Promise<Snapshot> {
  return {
    configured: true,
    season: 2026,
    clubs: d.clubs,
    table: d.table,
    fixtures: d.fixtures,
    cupFixtures: [],
    predictions: new Map(d.sim.clubs.map((c) => [c.clubId, toPred(c)])),
    previousPredictions: new Map(d.prevSim.clubs.map((c) => [c.clubId, toPred(c)])),
    run: { id: "demo", createdAt: new Date(Date.now() - 40 * 60_000).toISOString(), simulations: d.sim.simulations, fixturesRemaining: d.sim.fixturesRemaining, confidence: "medium", notes: "Preview from the live database", homeAdvantage: d.sim.homeAdvantage },
    misery: null,
    miseryWeek: [],
    status: { football: { key: "football", lastSuccessAt: new Date(Date.now() - 12 * 60_000).toISOString(), lastAttemptAt: null, lastError: null } },
    newcastle: d.table.find((r) => r.clubId === NEWCASTLE_ID),
    sunderland: d.table.find((r) => r.clubId === SUNDERLAND_ID),
  };
}
const now = new Date().toISOString();
export async function getNews(opts: { club?: string; limit?: number } = {}) {
  return NEWS.filter((a) => !opts.club || a.club === opts.club)
    .slice(0, opts.limit ?? 30)
    .map((a, i) => ({ id: String(i), slug: a.slug, url: "#", source: a.source, originalHeadline: a.orig, originalSummary: "", publishedAt: a.at, club: a.club, category: "x", keyFacts: [], howayHeadline: a.head, howayCommentary: a.take, punchline: a.punch, storyType: null, breaking: false, shares: 0, imageUrl: null })) as any[];
}
export async function getDailyMeme() { return null; }
export async function getBanter() {
  return [
    { id: "b1", kind: "headline", text: "Sample banter line — on the live site every line is built from the real table.", for_date: now.slice(0, 10) },
    { id: "b2", kind: "misery-report", text: "Sunderland 19th. The Championship's getting closer and you can hear it from here.", for_date: now.slice(0, 10) },
  ];
}
export async function getMemes() { return []; }
export async function getArticle() { return null; }
export async function getJarSeasons() { return []; }
export async function getEvents() { return []; }
export async function getDerbies() { return []; }
export async function getProbHistory() { return []; }
export async function getSeasonHistory() { return []; }
