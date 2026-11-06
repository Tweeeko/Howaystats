import "server-only";
import { adminDb } from "../database/client";
import { env } from "../env";
import { aiComplete, extractJson, GEORDIE_VOICE } from "../ai";
import { canonicalUrl, hashOf, isDuplicate } from "../content/dedupe";
import { ANGLES, classifyStory, type StoryType } from "./classify";
import { voiceCheck } from "../content/voice-check";
import { parseFeed, type FeedItem } from "./rss";

/** Publisher RSS feeds. Headlines + short summaries are used under the feeds' intended syndication; we always link back. */
export const FEEDS: { source: string; url: string }[] = [
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/teams/sunderland/rss.xml" },
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/teams/newcastle-united/rss.xml" },
  { source: "The Guardian", url: "https://www.theguardian.com/football/sunderland/rss" },
  { source: "The Guardian", url: "https://www.theguardian.com/football/newcastleunited/rss" },
  { source: "Sky Sports", url: "https://www.skysports.com/rss/11095" },
];

async function fetchFeed(f: { source: string; url: string }): Promise<FeedItem[]> {
  const res = await fetch(f.url, { headers: { "user-agent": "HOWAYSTATS news bot (+https://howaystats)" }, cache: "no-store" });
  if (!res.ok) throw new Error(`${f.url} HTTP ${res.status}`);
  return parseFeed(await res.text(), f.source);
}

async function fetchNewsApi(): Promise<FeedItem[]> {
  const key = env.newsApiKey();
  if (!key) return [];
  const q = encodeURIComponent('"Sunderland AFC" OR "Sunderland" AND (football OR "Premier League")');
  const res = await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=30`, {
    headers: { "x-api-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const json = (await res.json()) as { articles: { title: string; url: string; description: string | null; publishedAt: string; source: { name: string } }[] };
  return json.articles.map((a) => ({ title: a.title, link: a.url, summary: a.description ?? "", publishedAt: a.publishedAt, source: a.source.name }));
}

interface Rewrite {
  headline: string; // original HOWAYSTATS headline
  summary: string; // short, funny Geordie summary
  facts: string[]; // the actual football facts, neutral, from the source only
  punchline: string; // the closing editorial jab
}

/** Every number in our copy must already appear in the publisher's headline/summary; no quotes. */
export function rewriteFaithful(r: Rewrite, original: string): boolean {
  const orig = new Set(original.match(/\d+/g) ?? []);
  const all = [r.headline, r.summary, r.punchline, ...r.facts].join(" ");
  for (const n of all.match(/\d+/g) ?? []) if (!orig.has(n)) return false;
  if (/["“][^"”]{12,}["”]/.test(all)) return false; // we never put words in mouths
  if (r.headline.length > 100 || r.summary.length > 420 || r.punchline.length > 160) return false;
  return r.facts.length > 0 && r.facts.length <= 3;
}

/** Faithful AND in our voice: no AI clichés, no Americanisms, headline isn't a recycled original. */
export function rewritePasses(r: Rewrite, item: { title: string; summary: string }): { ok: boolean; reason?: string } {
  if (!rewriteFaithful(r, `${item.title} ${item.summary}`)) return { ok: false, reason: "not faithful to the source" };
  const h = voiceCheck(r.headline, item.title, { isHeadline: true });
  if (!h.ok) return h;
  for (const part of [r.summary, r.punchline]) {
    const v = voiceCheck(part);
    if (!v.ok) return v;
  }
  return { ok: true };
}

export async function rewriteStory(item: FeedItem, club: "sunderland" | "newcastle", type: StoryType): Promise<(Rewrite & { model: string }) | null> {
  const angle = club === "sunderland" ? ANGLES[type] : "A Newcastle story. Proud, dry, a bit smug. Find a way to work in a dig at Sunderland only if it's natural.";
  const system = `${GEORDIE_VOICE}

You are given ONE real news item: the publisher's headline and summary. Work in this order:
1. Understand what actually happened, using only the headline and summary.
2. Find the funniest legitimate angle from a Newcastle supporter's point of view. ${angle}
3. Write it up. Then check every fact against the source and cut anything that isn't there.

Return JSON only:
{"headline": "...", "summary": "...", "facts": ["...", "..."], "punchline": "..."}
- headline: an ORIGINAL headline, max 12 words, sentence case. Must not reuse the publisher's wording.
- summary: 2–3 short sentences of Geordie commentary on what happened.
- facts: 1–3 plain, neutral bullet points of what the source actually reports, in your own words.
- punchline: one short closing line. Dry. No exclamation mark.
- If the source says something is a rumour or "reportedly", keep that wording. No quotation marks anywhere.

Tone examples (style only, never copy): "Mackems get carried away after beating a team nobody's heard of" · "Three points? Calm down, they're acting like they've won the Champions League" · "Wearside celebrations reach dangerous levels after a scrappy draw" · "Another weekend, another excuse doing the rounds on Wearside".`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await aiComplete(system, `Publisher: ${item.source}\nHeadline: ${item.title}\nSummary: ${item.summary}${attempt ? "\n(Previous attempt failed our checks. Stick strictly to the source and the voice rules.)" : ""}`);
    const r = extractJson<Rewrite>(text);
    if (!r || typeof r.headline !== "string" || typeof r.summary !== "string" || typeof r.punchline !== "string" || !Array.isArray(r.facts)) continue;
    if (rewritePasses(r, item).ok) return { ...r, model: `${env.aiProvider()}:${env.aiModel() ?? "default"}` };
  }
  return null;
}

const slug = (title: string, url: string) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60)}-${hashOf(url).slice(0, 6)}`;

/**
 * Daily news discovery. Sources fail independently; nothing here can affect football data.
 * Stories without a verified rewrite are stored as `pending` for an admin to review.
 */
export async function discoverNews() {
  const db = adminDb();
  const results = await Promise.allSettled([...FEEDS.map(fetchFeed), fetchNewsApi()]);
  const errors = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const since = new Date(Date.now() - 21 * 86_400_000).toISOString();
  const { data: existing } = await db.from("news_articles").select("url, original_headline, published_at").gte("created_at", since);
  const seen = (existing ?? []).map((e) => ({ url: e.url, title: e.original_headline, publishedAt: e.published_at }));

  let stored = 0, published = 0, skipped = 0;
  for (const item of items) {
    if (item.publishedAt && Date.parse(item.publishedAt) < Date.now() - 7 * 86_400_000) { skipped++; continue; }
    const c = classifyStory(item.title, item.summary);
    if (!c.category) { skipped++; continue; }
    const candidate = { url: item.link, title: item.title, publishedAt: item.publishedAt };
    if (isDuplicate(candidate, seen)) { skipped++; continue; }
    seen.push(candidate);

    const club = c.aboutSunderland ? "sunderland" : "newcastle";
    let rw: Awaited<ReturnType<typeof rewriteStory>> = null;
    try {
      rw = await rewriteStory(item, club, c.storyType);
    } catch (e) {
      errors.push(`rewrite: ${(e as Error).message}`);
    }
    const url = canonicalUrl(item.link);
    const status = rw ? "published" : "pending";
    const { error } = await db.from("news_articles").insert({
      slug: slug(item.title, url),
      url,
      url_hash: hashOf(url),
      source: item.source,
      original_headline: item.title,
      original_summary: item.summary.slice(0, 400),
      published_at: item.publishedAt,
      club,
      category: c.category,
      negativity: c.negativity,
      key_facts: rw?.facts ?? [],
      howay_headline: rw?.headline ?? null,
      howay_commentary: rw?.summary ?? null,
      howay_punchline: rw?.punchline ?? null,
      story_type: c.storyType,
      rewrite_model: rw?.model ?? null,
      status,
    });
    if (!error) {
      stored++;
      if (status === "published") published++;
    }
  }
  return { fetched: items.length, stored, published, skipped, errors };
}
