import "server-only";
import { adminDb } from "../database/client";
import { env } from "../env";
import { aiComplete, extractJson, GEORDIE_VOICE } from "../ai";
import { canonicalUrl, hashOf, isDuplicate } from "../content/dedupe";
import { classifyStory } from "./classify";
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
  headline: string;
  commentary: string;
  keyFacts: string[];
}

/** Every number in our copy must already appear in the publisher's headline/summary. */
export function rewriteFaithful(r: Rewrite, original: string): boolean {
  const orig = new Set(original.match(/\d+/g) ?? []);
  const all = [r.headline, r.commentary, ...r.keyFacts].join(" ");
  for (const n of all.match(/\d+/g) ?? []) if (!orig.has(n)) return false;
  if (/["“][^"”]{12,}["”]/.test(all)) return false; // no quotes — we never put words in mouths
  if (r.headline.length > 90 || r.commentary.length > 420) return false;
  return r.keyFacts.length > 0 && r.keyFacts.length <= 3;
}

export async function rewriteStory(item: FeedItem, club: "sunderland" | "newcastle"): Promise<(Rewrite & { model: string }) | null> {
  const system = `${GEORDIE_VOICE}
You are given ONE real news item (headline + publisher summary). Produce JSON only:
{"headline": "...", "commentary": "...", "keyFacts": ["...", "..."]}
Rules:
- keyFacts: 1–3 short factual bullet points restating ONLY what the headline/summary says, neutrally, in your own words.
- headline: a witty ALL-CAPS alternative headline, max 12 words, true to the facts.
- commentary: 2–3 short sentences of ${club === "sunderland" ? "sarcastic Geordie commentary at Sunderland's expense" : "proud, dry Geordie commentary"}.
- Do NOT add any fact, number, injury, quote, name or allegation that is not in the input. If the story is a rumour, say "reportedly".
- No quotation marks.`;
  const text = await aiComplete(system, `Publisher: ${item.source}\nHeadline: ${item.title}\nSummary: ${item.summary}`);
  const r = extractJson<Rewrite>(text);
  if (!r || typeof r.headline !== "string" || typeof r.commentary !== "string" || !Array.isArray(r.keyFacts)) return null;
  if (!rewriteFaithful(r, `${item.title} ${item.summary}`)) return null;
  return { ...r, headline: r.headline.toUpperCase(), model: `${env.aiProvider()}:${env.aiModel() ?? "default"}` };
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
      rw = await rewriteStory(item, club);
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
      key_facts: rw?.keyFacts ?? [],
      howay_headline: rw?.headline ?? null,
      howay_commentary: rw?.commentary ?? null,
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
