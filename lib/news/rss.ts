/** Minimal dependency-free RSS 2.0 / Atom parser — enough for headline, link, summary and date. */
export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  source: string;
  /** Lead photo from the feed (media:content / media:thumbnail / enclosure), if the publisher supplied one. */
  imageUrl: string | null;
}

/** Picks the biggest image the feed offers. BBC thumbnails are 240px; their CDN serves the same image at 976px. */
export function feedImage(block: string): string | null {
  const cands: { url: string; w: number }[] = [];
  for (const m of block.matchAll(/<media:(?:content|thumbnail)\b([^>]*)>/gi)) {
    const attrs = m[1];
    const url = attrs.match(/\burl="([^"]+)"/i)?.[1];
    if (!url) continue;
    const medium = attrs.match(/\bmedium="([^"]+)"/i)?.[1];
    const type = attrs.match(/\btype="([^"]+)"/i)?.[1];
    if ((medium && medium !== "image") || (type && !type.startsWith("image"))) continue;
    cands.push({ url, w: Number(attrs.match(/\bwidth="(\d+)"/i)?.[1] ?? 0) });
  }
  for (const m of block.matchAll(/<enclosure\b([^>]*)>/gi)) {
    const url = m[1].match(/\burl="([^"]+)"/i)?.[1];
    const type = m[1].match(/\btype="([^"]+)"/i)?.[1] ?? "";
    if (url && type.startsWith("image")) cands.push({ url, w: 0 });
  }
  if (!cands.length) return null;
  const best = cands.sort((a, b) => b.w - a.w)[0].url.replace(/&amp;/g, "&");
  if (!/^https:\/\//.test(best)) return null;
  return best.replace(/(ichef\.bbci\.co\.uk\/(?:ace\/standard|news))\/\d+\//, "$1/976/");
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#8217;/g, "’")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : null;
}

export function parseFeed(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const b of blocks) {
    const title = decode(tag(b, "title") ?? "");
    let link = decode(tag(b, "link") ?? "");
    if (!link) {
      const href = b.match(/<link[^>]*href="([^"]+)"/i);
      link = href ? href[1] : "";
    }
    const summary = decode(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content") ?? "");
    const rawDate = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    const d = rawDate ? new Date(decode(rawDate)) : null;
    if (title && link) {
      items.push({
        title,
        link,
        summary: summary.slice(0, 600),
        publishedAt: d && !isNaN(d.getTime()) ? d.toISOString() : null,
        source,
        imageUrl: feedImage(b),
      });
    }
  }
  return items;
}
