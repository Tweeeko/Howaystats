import { demoData } from "./demo-data";
import type { Snapshot } from "../lib/database/queries";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "../lib/football/provider";
export type * from "../lib/database/queries";

const d = demoData();
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
    run: { id: "demo", createdAt: new Date(Date.now() - 40 * 60_000).toISOString(), simulations: d.sim.simulations, fixturesRemaining: d.sim.fixturesRemaining, confidence: "medium", notes: "Design preview — simulated sample season.", homeAdvantage: d.sim.homeAdvantage },
    misery: null,
    miseryWeek: [],
    status: { football: { key: "football", lastSuccessAt: new Date(Date.now() - 12 * 60_000).toISOString(), lastAttemptAt: null, lastError: null } },
    newcastle: d.table.find((r) => r.clubId === NEWCASTLE_ID),
    sunderland: d.table.find((r) => r.clubId === SUNDERLAND_ID),
  };
}
const now = new Date().toISOString();
export async function getNews(opts: { club?: string } = {}) {
  return ([
    { id: "00000000-0000-0000-0000-000000000001", slug: "preview-1", url: "#", source: "Sample Publisher", originalHeadline: "SAMPLE ONLY: Sunderland beaten at home after defensive errors", originalSummary: "", publishedAt: now, club: "sunderland", category: "sunderland-slump", keyFacts: ["SAMPLE: placeholder fact — the live site only shows facts taken from the linked publisher."], howayHeadline: "SAMPLE: WEARSIDE FINDS OUT DEFENDING IS OPTIONAL", howayCommentary: "Another afternoon to forget on the Wear. The other lot turned up, did the job and went home with the points. Sample copy, mind — the real thing is written from the real story.", punchline: "Someone check on Sunderland. Actually, divvent bother.", storyType: null, breaking: false, shares: 0 },
    { id: "00000000-0000-0000-0000-000000000002", slug: "preview-2", url: "#", source: "Sample Publisher", originalHeadline: "SAMPLE ONLY: Bottom club stick with manager", originalSummary: "", publishedAt: now, club: "sunderland", category: "championship-watch", keyFacts: [], howayHeadline: "SAMPLE: GAFFER STAYS. WEAR BRACES ITSELF", howayCommentary: "Sample copy. Backing the manager when you're in the bottom three. Bold. We'll see.", punchline: "Get the Championship fixture list printed, like.", storyType: null, breaking: false, shares: 0 },
    { id: "00000000-0000-0000-0000-000000000003", slug: "preview-3", url: "#", source: "Sample Publisher", originalHeadline: "SAMPLE ONLY: Injury setback on Wearside", originalSummary: "", publishedAt: now, club: "sunderland", category: "wearside-woes", keyFacts: [], howayHeadline: "SAMPLE: PHYSIO ROOM BUSIER THAN THE CLUB SHOP", howayCommentary: "Sample copy. Another one on the treatment table. Wearside's getting used to it.", punchline: "Divvent worry, the bench is just as bad.", storyType: null, breaking: false, shares: 0 },
    { id: "00000000-0000-0000-0000-000000000004", slug: "preview-4", url: "#", source: "Sample Publisher", originalHeadline: "SAMPLE ONLY: Newcastle win away", originalSummary: "", publishedAt: now, club: "newcastle", category: "newcastle-news", keyFacts: [], howayHeadline: "SAMPLE: TOON DO A JOB ON THE ROAD", howayCommentary: "Sample copy. Three points, no drama, home in time for tea.", punchline: "More of that, lads.", storyType: null, breaking: false, shares: 0 },
  ] as any[]).filter((a) => !opts.club || a.club === opts.club).map((a) => ({ imageUrl: null, ...a }));
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
