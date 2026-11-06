import "server-only";
import { cache } from "react";
import { publicDb } from "./client";
import { rowToClub, rowToFixture, rowToStanding } from "./mappers";
import { currentSeason, NEWCASTLE_ID, SUNDERLAND_ID } from "../football/provider";
import type { Club, Fixture, StandingRow } from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Prediction {
  clubId: number;
  expectedPoints: number;
  expectedPosition: number;
  projectedPosition: number;
  medianPoints: number;
  pointsP10: number;
  pointsP90: number;
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
  fixtureDifficulty: number;
  remaining: number;
}

export interface ModelRun {
  id: string;
  createdAt: string;
  simulations: number;
  fixturesRemaining: number;
  confidence: "low" | "medium" | "high";
  notes: string | null;
  homeAdvantage: number;
}

export interface MiserySnapshot {
  takenAt: string;
  miseryIndex: number;
  stateScore: number;
  eventScore: number;
  jarPercent: number;
  jarUnits: number;
  happiness: number;
  biggestEvent: string | null;
  payload: {
    jarHistory?: { fixtureId: number; at: string; label: string; added: number; dropped: number; percent: number }[];
    recentEvents?: { label: string; at: string; misery: number }[];
    parts?: { odds: number; position: number; results: number };
  };
}

export interface DataStatus {
  key: string;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

export interface Snapshot {
  configured: boolean;
  season: number;
  clubs: Map<number, Club>;
  table: StandingRow[];
  fixtures: Fixture[]; // Premier League only — the table, model and Tear Jar use these
  cupFixtures: Fixture[]; // Newcastle/Sunderland in Europe and the cups
  predictions: Map<number, Prediction>;
  previousPredictions: Map<number, Prediction>;
  run: ModelRun | null;
  misery: MiserySnapshot | null;
  miseryWeek: MiserySnapshot[];
  status: Record<string, DataStatus>;
  newcastle?: StandingRow;
  sunderland?: StandingRow;
}

const toPrediction = (r: any): Prediction => ({
  clubId: r.club_id,
  expectedPoints: Number(r.expected_points),
  expectedPosition: Number(r.expected_position),
  projectedPosition: r.projected_position,
  medianPoints: r.median_points,
  pointsP10: r.points_p10,
  pointsP90: r.points_p90,
  positionProbs: (r.position_probs as number[]).map(Number),
  pTitle: Number(r.p_title),
  pTop4: Number(r.p_top4),
  pTop5: Number(r.p_top5),
  pTop6: Number(r.p_top6),
  pTop7: Number(r.p_top7),
  pTop10: Number(r.p_top10),
  pRelegation: Number(r.p_relegation),
  pSurvival: Number(r.p_survival),
  p18: Number(r.p18),
  p19: Number(r.p19),
  p20: Number(r.p20),
  fixtureDifficulty: Number(r.fixture_difficulty),
  remaining: r.remaining,
});

const toMisery = (r: any): MiserySnapshot => ({
  takenAt: r.taken_at,
  miseryIndex: r.misery_index,
  stateScore: Number(r.state_score),
  eventScore: Number(r.event_score),
  jarPercent: Number(r.jar_percent),
  jarUnits: Number(r.jar_units),
  happiness: r.happiness,
  biggestEvent: r.biggest_event,
  payload: r.payload ?? {},
});

const empty = (season: number): Snapshot => ({
  configured: false,
  season,
  clubs: new Map(),
  table: [],
  fixtures: [],
  cupFixtures: [],
  predictions: new Map(),
  previousPredictions: new Map(),
  run: null,
  misery: null,
  miseryWeek: [],
  status: {},
});

/** One cached read per request for everything the football pages need. Never fabricates: empty means empty. */
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const season = currentSeason();
  const db = publicDb();
  if (!db) return empty(season);
  try {
    const weekAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const [clubs, standings, fixtures, runs, misery, status] = await Promise.all([
      db.from("clubs").select("*"),
      db.from("standings").select("*").eq("season", season).order("position"),
      db.from("fixtures").select("*").eq("season", season).order("kickoff"),
      db.from("model_runs").select("*").eq("season", season).order("created_at", { ascending: false }).limit(2),
      db.from("misery_snapshots").select("*").eq("season", season).gte("taken_at", weekAgo).order("taken_at", { ascending: false }).limit(60),
      db.from("data_status").select("*"),
    ]);
    const s = empty(season);
    s.configured = true;
    for (const c of clubs.data ?? []) s.clubs.set(c.id, rowToClub(c));
    s.table = (standings.data ?? []).map(rowToStanding);
    const all = (fixtures.data ?? []).map(rowToFixture);
    s.fixtures = all.filter((f) => (f.leagueId ?? 39) === 39);
    s.cupFixtures = all.filter((f) => (f.leagueId ?? 39) !== 39);
    const [latest, prev] = runs.data ?? [];
    if (latest) {
      s.run = {
        id: latest.id,
        createdAt: latest.created_at,
        simulations: latest.simulations,
        fixturesRemaining: latest.fixtures_remaining,
        confidence: latest.confidence,
        notes: latest.notes,
        homeAdvantage: Number(latest.home_advantage),
      };
      const ids = [latest.id, prev?.id].filter(Boolean);
      const { data: preds } = await db.from("predictions").select("*").in("run_id", ids);
      for (const p of preds ?? []) (p.run_id === latest.id ? s.predictions : s.previousPredictions).set(p.club_id, toPrediction(p));
    }
    s.miseryWeek = (misery.data ?? []).map(toMisery);
    s.misery = s.miseryWeek[0] ?? null;
    for (const d of status.data ?? []) {
      s.status[d.key] = { key: d.key, lastSuccessAt: d.last_success_at, lastAttemptAt: d.last_attempt_at, lastError: d.last_error };
    }
    s.newcastle = s.table.find((r) => r.clubId === NEWCASTLE_ID);
    s.sunderland = s.table.find((r) => r.clubId === SUNDERLAND_ID);
    return s;
  } catch (e) {
    console.error("snapshot failed", e);
    return empty(season);
  }
});

export interface NewsArticle {
  id: string;
  slug: string;
  url: string;
  source: string;
  originalHeadline: string;
  originalSummary: string | null;
  publishedAt: string | null;
  club: "sunderland" | "newcastle";
  category: string;
  keyFacts: string[];
  howayHeadline: string | null;
  howayCommentary: string | null;
  punchline: string | null;
  storyType: string | null;
  breaking: boolean;
  shares: number;
}

const toNews = (r: any): NewsArticle => ({
  id: r.id,
  slug: r.slug,
  url: r.url,
  source: r.source,
  originalHeadline: r.original_headline,
  originalSummary: r.original_summary,
  publishedAt: r.published_at,
  club: r.club,
  category: r.category,
  keyFacts: r.key_facts ?? [],
  howayHeadline: r.howay_headline,
  howayCommentary: r.howay_commentary,
  punchline: r.howay_punchline ?? null,
  storyType: r.story_type ?? null,
  breaking: r.breaking,
  shares: r.shares,
});

export async function getNews(opts: { category?: string; limit?: number; sort?: "latest" | "shared" } = {}) {
  const db = publicDb();
  if (!db) return [];
  let q = db.from("news_articles").select("*").eq("status", "published");
  if (opts.category) q = q.eq("category", opts.category);
  q = opts.sort === "shared" ? q.order("shares", { ascending: false }) : q.order("published_at", { ascending: false, nullsFirst: false });
  const { data } = await q.limit(opts.limit ?? 30);
  return (data ?? []).map(toNews);
}

export async function getArticle(slug: string) {
  const db = publicDb();
  if (!db) return null;
  const { data } = await db.from("news_articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data ? toNews(data) : null;
}

export interface Meme {
  id: string;
  source: string;
  sourceUrl: string;
  mediaUrl: string | null;
  mediaType: string;
  title: string;
  author: string | null;
  authorUrl: string | null;
  licenceNote: string;
  caption: string | null;
  featuredOn: string | null;
  discoveredAt: string;
  submittedBy: string | null;
  shares: number;
}

const toMeme = (r: any): Meme => ({
  id: r.id,
  source: r.source,
  sourceUrl: r.source_url,
  mediaUrl: r.media_url,
  mediaType: r.media_type,
  title: r.title,
  author: r.author,
  authorUrl: r.author_url,
  licenceNote: r.licence_note,
  caption: r.geordie_caption,
  featuredOn: r.featured_on,
  discoveredAt: r.discovered_at,
  submittedBy: r.submitted_by,
  shares: r.shares,
});

/** Today's meme; if none was featured today, the best previously approved meme (flagged as such). */
export async function getDailyMeme(): Promise<{ meme: Meme; fromArchive: boolean } | null> {
  const db = publicDb();
  if (!db) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data: t } = await db.from("memes").select("*").eq("status", "published").eq("featured_on", today).maybeSingle();
  if (t) return { meme: toMeme(t), fromArchive: false };
  const { data: best } = await db.from("memes").select("*").eq("status", "published").order("shares", { ascending: false }).order("score", { ascending: false }).limit(1);
  return best?.[0] ? { meme: toMeme(best[0]), fromArchive: true } : null;
}

export async function getMemes(opts: { sort?: "latest" | "popular"; source?: string; limit?: number } = {}) {
  const db = publicDb();
  if (!db) return [];
  let q = db.from("memes").select("*").eq("status", "published");
  if (opts.source) q = q.eq("source", opts.source);
  q = opts.sort === "popular" ? q.order("shares", { ascending: false }).order("score", { ascending: false }) : q.order("discovered_at", { ascending: false });
  const { data } = await q.limit(opts.limit ?? 24);
  return (data ?? []).map(toMeme);
}

export async function getBanter(limit = 8) {
  const db = publicDb();
  if (!db) return [];
  const { data } = await db.from("banter").select("id, kind, text, for_date, generated_by").eq("status", "published").order("for_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as { id: string; kind: string; text: string; for_date: string; generated_by: string }[];
}

export async function getEvents(fixtureIds: number[]) {
  const db = publicDb();
  if (!db || !fixtureIds.length) return [];
  const { data } = await db.from("fixture_events").select("*").in("fixture_id", fixtureIds).order("minute");
  return (data ?? []) as { fixture_id: number; minute: number; extra: number | null; team_id: number; player: string | null; assist: string | null; type: string; detail: string }[];
}

export async function getJarSeasons() {
  const db = publicDb();
  if (!db) return [];
  const { data } = await db.from("tear_jar_seasons").select("*").order("season", { ascending: false });
  return (data ?? []) as { season: number; final_percent: number; tears_collected: number; overflowed: boolean }[];
}

/** Every stored Newcastle v Sunderland league meeting, any season (for head-to-head). */
export async function getDerbies(a: number, b: number) {
  const db = publicDb();
  if (!db) return [];
  const { data } = await db
    .from("fixtures")
    .select("*")
    .or(`and(home_id.eq.${a},away_id.eq.${b}),and(home_id.eq.${b},away_id.eq.${a})`)
    .order("kickoff", { ascending: false });
  return (data ?? []).map(rowToFixture);
}

/** A club's modelled probabilities across every model run this season (for movement charts). */
export async function getProbHistory(clubId: number, season: number) {
  const db = publicDb();
  if (!db) return [];
  const { data: runs } = await db.from("model_runs").select("id, created_at").eq("season", season).order("created_at");
  if (!runs?.length) return [];
  const { data: preds } = await db.from("predictions").select("run_id, p_relegation, p_top4, p_top7").eq("club_id", clubId).in("run_id", runs.map((r) => r.id));
  const at = new Map(runs.map((r) => [r.id, r.created_at as string]));
  return (preds ?? [])
    .map((p) => ({ at: at.get(p.run_id)!, pRelegation: Number(p.p_relegation), pTop4: Number(p.p_top4), pTop7: Number(p.p_top7) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Final (or latest) league positions for both clubs in previous stored seasons. */
export async function getSeasonHistory(ids: number[]) {
  const db = publicDb();
  if (!db) return [];
  const { data } = await db.from("standings").select("season, club_id, position, points, goal_difference, played").in("club_id", ids).order("season", { ascending: false });
  return (data ?? []) as { season: number; club_id: number; position: number; points: number; goal_difference: number; played: number }[];
}
