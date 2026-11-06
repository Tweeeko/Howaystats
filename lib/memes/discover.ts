import "server-only";
import { adminDb } from "../database/client";
import { env } from "../env";
import { aiComplete, GEORDIE_VOICE } from "../ai";
import { canonicalUrl, hashOf } from "../content/dedupe";
import { tractionScore } from "./rank";

/**
 * Daily meme discovery, fully automatic. Nobody has to upload anything.
 *
 * Source: GIPHY's official search API (free key, embedding allowed with "Powered by GIPHY").
 * Reddit is gone: it blocked keyless access in May 2026 and stopped issuing new API access
 * on 31 October 2026.
 *
 * We search by keyword, keep the newest (by GIPHY's upload / trending date), and publish
 * automatically. Rated G/PG only. Nothing invented: if GIPHY returns nothing new, the page
 * shows the best of what we already have.
 */

const RELEVANT = /\b(sunderland|mackems?|black cats|wearside|stadium of light|tyne[- ]wear|relegat\w*|championship)\b/i;
const NSFW_OR_NASTY = /\b(nsfw|nude|porn|rape|suicide|kill yourself|racis\w*|slur)\b/i;

export interface MemeCandidate {
  source: "giphy";
  sourceId: string;
  sourceUrl: string;
  mediaUrl: string | null;
  mediaType: "image" | "gif" | "video" | "embed";
  title: string;
  author: string | null;
  authorUrl: string | null;
  licenceNote: string;
  score: number;
}

/** Relevance filter shared with the tests. */
export function isRelevantMeme(title: string, nsfw = false): boolean {
  return !nsfw && RELEVANT.test(title) && !NSFW_OR_NASTY.test(title);
}

/** Keyword searches. Club terms first; reaction terms only count if the GIF is about football. */
export const MEME_SEARCHES: { q: string; club: boolean }[] = [
  { q: "sunderland afc", club: true },
  { q: "sunderland", club: true },
  { q: "mackem", club: true },
  { q: "black cats football", club: true },
  { q: "stadium of light", club: true },
  { q: "sunderland til i die", club: true },
  { q: "football fan crying", club: false },
  { q: "sad football fan", club: false },
  { q: "relegation", club: false },
  { q: "football fail", club: false },
];

type Gif = {
  id: string;
  title: string;
  url: string;
  username: string;
  rating: string;
  import_datetime?: string;
  trending_datetime?: string;
  user?: { profile_url?: string; display_name?: string };
  images: { downsized_medium?: { url: string }; original?: { url: string } };
};

const parseGiphyDate = (d?: string) => (d && !d.startsWith("0000") ? Date.parse(d.replace(" ", "T") + "Z") : NaN);

/** Newest first: the later of upload and trending date, so recently trending old GIFs count too. */
export function giphyRecency(g: Pick<Gif, "import_datetime" | "trending_datetime">): number {
  const t = Math.max(parseGiphyDate(g.import_datetime) || 0, parseGiphyDate(g.trending_datetime) || 0);
  return t || 0;
}

async function fromGiphy(): Promise<MemeCandidate[]> {
  const key = env.giphyKey();
  if (!key) throw new Error("No GIPHY key set. Add GIPHY_API_KEY in Vercel (free at developers.giphy.com) and memes will start pulling in automatically.");
  const out: MemeCandidate[] = [];
  for (const { q, club } of MEME_SEARCHES) {
    // Two pages per term so there's something newer than the top-relevance hits to pick from.
    for (const offset of [0, 25]) {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=25&offset=${offset}&rating=pg&lang=en&bundle=messaging_non_clips`, { cache: "no-store" });
      if (res.status === 429) throw new Error("GIPHY rate limit hit (beta keys allow 100 calls an hour). It'll catch up next run.");
      if (!res.ok) continue;
      const json = (await res.json()) as { data: Gif[] };
      json.data.forEach((g, i) => {
        const rank = offset + i; // GIPHY orders search by relevance, which leans on popularity
        const title = (g.title || q).replace(/\s*GIF( by .*)?$/i, "").trim() || q;
        if (!club && !/football|soccer|fan|relegat|premier|goal|stadium|supporter/i.test(g.title || "")) return;
        if (!isRelevantMeme(club ? `${title} sunderland` : `${title} relegation`)) return;
        const media = g.images.downsized_medium?.url ?? g.images.original?.url ?? null;
        if (!media) return;
        const when = giphyRecency(g);
        const ageDays = when ? (Date.now() - when) / 86_400_000 : 3650;
        out.push({
          source: "giphy",
          sourceId: g.id,
          sourceUrl: g.url,
          mediaUrl: media,
          mediaType: "gif",
          title,
          author: g.user?.display_name || g.username || "GIPHY",
          authorUrl: g.user?.profile_url ?? g.url,
          licenceNote: "Powered by GIPHY. Embedded via the GIPHY API with attribution.",
          score: tractionScore({ club, rank, trendedAt: parseGiphyDate(g.trending_datetime), ageDays }),
        });
      });
    }
  }
  // De-duplicate across searches, keep the best score.
  const best = new Map<string, MemeCandidate>();
  for (const m of out) if (!best.has(m.sourceId) || best.get(m.sourceId)!.score < m.score) best.set(m.sourceId, m);
  return [...best.values()];
}

async function captionFor(title: string): Promise<string | null> {
  const t = await aiComplete(
    `${GEORDIE_VOICE}\nWrite ONE short caption (max 14 words) for a football meme with the given title. No numbers, no quotes, no facts beyond the title.`,
    `Meme title: ${title}`,
    80,
  ).catch(() => null);
  if (!t) return null;
  const c = t.trim().replace(/^["“]|["”]$/g, "");
  return c.length <= 120 && !/\d/.test(c) ? c : null;
}

export async function discoverMemes() {
  const db = adminDb();
  const results = await Promise.allSettled([fromGiphy()]);
  const errors = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason));
  const candidates = results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).sort((a, b) => b.score - a.score);

  let stored = 0;
  if (errors.length && !candidates.length) throw new Error(errors.join(" | "));
  for (const m of candidates.slice(0, 30)) {
    const url = canonicalUrl(m.sourceUrl);
    const { data: dupe } = await db.from("memes").select("id").eq("url_hash", hashOf(url)).maybeSingle();
    if (dupe) continue;
    const caption = await captionFor(m.title);
    const { error } = await db.from("memes").insert({
      source: m.source,
      source_id: m.sourceId,
      source_url: url,
      url_hash: hashOf(url),
      media_url: m.mediaUrl,
      media_type: m.mediaType,
      title: m.title.slice(0, 200),
      author: m.author,
      author_url: m.authorUrl,
      licence_note: m.licenceNote,
      geordie_caption: caption,
      score: m.score,
      // GIPHY content is licensed for embedding and rated PG: published automatically.
      status: "published",
      published_at: new Date().toISOString(),
    });
    if (!error) stored++;
  }

  // Pick today's featured meme: newest published one never featured before.
  const today = new Date().toISOString().slice(0, 10);
  const { data: already } = await db.from("memes").select("id").eq("featured_on", today).maybeSingle();
  let featured: string | null = already?.id ?? null;
  if (!featured) {
    const { data: next } = await db
      .from("memes")
      .select("id")
      .eq("status", "published")
      .is("featured_on", null)
      .gte("discovered_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
      .order("score", { ascending: false })
      .limit(1);
    if (next?.[0]) {
      await db.from("memes").update({ featured_on: today }).eq("id", next[0].id);
      featured = next[0].id;
    }
  }
  return { candidates: candidates.length, stored, featured, fallback: !featured, errors };
}
