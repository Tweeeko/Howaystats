import "server-only";
import { adminDb } from "../database/client";
import { env } from "../env";
import { aiComplete, GEORDIE_VOICE } from "../ai";
import { canonicalUrl, hashOf } from "../content/dedupe";

/**
 * Daily meme discovery from sources that permit it:
 *  - Reddit, via the official OAuth API. We store the permalink and show Reddit's own
 *    media URL with attribution + link (no re-hosting).
 *  - GIPHY, via the official search API (embedding with "Powered by GIPHY" attribution is permitted).
 * Nothing is invented: if nothing relevant turns up, the page falls back to the best
 * previously approved meme, clearly labelled.
 */

const RELEVANT = /\b(sunderland|mackems?|black cats|wearside|stadium of light|tyne[- ]wear|relegat\w*|championship)\b/i;
const NSFW_OR_NASTY = /\b(nsfw|nude|porn|rape|suicide|kill yourself|racis\w*|slur)\b/i;

export interface MemeCandidate {
  source: "reddit" | "giphy";
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

async function redditToken(): Promise<string | null> {
  const id = env.redditClientId();
  const secret = env.redditClientSecret();
  if (!id || !secret) return null;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "web:howaystats:1.0 (meme discovery)",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reddit auth HTTP ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function fromReddit(): Promise<MemeCandidate[]> {
  const token = await redditToken();
  if (!token) return [];
  const subs = ["NUFC", "soccercirclejerk", "PremierLeague", "footballmemes"];
  const out: MemeCandidate[] = [];
  for (const sub of subs) {
    const res = await fetch(`https://oauth.reddit.com/r/${sub}/search?q=sunderland&restrict_sr=1&sort=top&t=week&limit=25`, {
      headers: { authorization: `Bearer ${token}`, "user-agent": "web:howaystats:1.0 (meme discovery)" },
      cache: "no-store",
    });
    if (!res.ok) continue;
    type Post = { data: { id: string; title: string; permalink: string; url: string; author: string; over_18: boolean; score: number; post_hint?: string; is_video?: boolean } };
    const json = (await res.json()) as { data: { children: Post[] } };
    for (const { data: p } of json.data.children) {
      const isImage = p.post_hint === "image" || /\.(jpe?g|png|gif|webp)$/i.test(p.url);
      if (!isImage || !isRelevantMeme(p.title, p.over_18)) continue;
      out.push({
        source: "reddit",
        sourceId: p.id,
        sourceUrl: `https://www.reddit.com${p.permalink}`,
        mediaUrl: p.url,
        mediaType: /\.gif$/i.test(p.url) ? "gif" : "image",
        title: p.title,
        author: `u/${p.author}`,
        authorUrl: `https://www.reddit.com/user/${p.author}`,
        licenceNote: `Posted to r/${sub} on Reddit. Shown via Reddit's media link with attribution; all rights remain with the creator.`,
        score: p.score,
      });
    }
  }
  return out;
}

async function fromGiphy(): Promise<MemeCandidate[]> {
  const key = env.giphyKey();
  if (!key) return [];
  const terms = ["sunderland", "mackem", "relegation football", "football fans crying"];
  const out: MemeCandidate[] = [];
  for (const q of terms) {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=10&rating=pg-13&lang=en`, { cache: "no-store" });
    if (!res.ok) continue;
    type Gif = { id: string; title: string; url: string; username: string; user?: { profile_url?: string }; images: { downsized_medium?: { url: string } } };
    const json = (await res.json()) as { data: Gif[] };
    for (const g of json.data) {
      const title = g.title || q;
      // GIPHY search for "sunderland" is relevant by query; generic terms still need a football context.
      if (q !== "sunderland" && q !== "mackem" && !/football|soccer|fan|relegat/i.test(title)) continue;
      out.push({
        source: "giphy",
        sourceId: g.id,
        sourceUrl: g.url,
        mediaUrl: g.images.downsized_medium?.url ?? null,
        mediaType: "gif",
        title,
        author: g.username || "GIPHY",
        authorUrl: g.user?.profile_url ?? g.url,
        licenceNote: "Powered by GIPHY. Embedded via the GIPHY API with attribution.",
        score: q === "sunderland" ? 50 : 10,
      });
    }
  }
  return out;
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
  const results = await Promise.allSettled([fromReddit(), fromGiphy()]);
  const errors = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason));
  const candidates = results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).sort((a, b) => b.score - a.score);

  let stored = 0;
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
      // GIPHY content is licensed for embedding: auto-publish. Reddit posts wait for moderation.
      status: m.source === "giphy" ? "published" : "pending",
      published_at: m.source === "giphy" ? new Date().toISOString() : null,
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
      .order("score", { ascending: false })
      .order("discovered_at", { ascending: false })
      .limit(1);
    if (next?.[0]) {
      await db.from("memes").update({ featured_on: today }).eq("id", next[0].id);
      featured = next[0].id;
    }
  }
  return { candidates: candidates.length, stored, featured, fallback: !featured, errors };
}
