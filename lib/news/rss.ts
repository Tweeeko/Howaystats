/** Minimal dependency-free RSS 2.0 / Atom parser — enough for headline, link, summary and date. */
export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  source: string;
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
      });
    }
  }
  return items;
}
