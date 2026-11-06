import { createHash } from "node:crypto";

const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$|ref_|at_|ocid|cmpid|ns_|xtor)/i;

/** Normalise a URL so the same story shared with tracking junk dedupes cleanly. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\.|^m\.|^amp\./, "");
    u.protocol = "https:";
    const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k));
    keep.sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    for (const [k, v] of keep) u.searchParams.append(k, v);
    u.pathname = u.pathname.replace(/\/amp\/?$/, "/").replace(/\/+$/, "") || "/";
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

export function hashOf(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

const STOP = new Set(
  "a an the of to in on at for and or but is are was were be as by with after before from v vs".split(" "),
);

export function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Is `candidate` a duplicate of anything already seen?
 * Same canonical URL → duplicate. Otherwise headlines with ≥ 0.6 token overlap
 * published within 48 hours of each other are treated as the same story.
 */
export function isDuplicate(
  candidate: { url: string; title: string; publishedAt?: string | null },
  existing: { url: string; title: string; publishedAt?: string | null }[],
  threshold = 0.6,
): boolean {
  const cu = canonicalUrl(candidate.url);
  const ct = tokens(candidate.title);
  const cTime = candidate.publishedAt ? Date.parse(candidate.publishedAt) : NaN;
  return existing.some((e) => {
    if (canonicalUrl(e.url) === cu) return true;
    const eTime = e.publishedAt ? Date.parse(e.publishedAt) : NaN;
    const close = isNaN(cTime) || isNaN(eTime) || Math.abs(cTime - eTime) < 48 * 3600_000;
    return close && jaccard(ct, tokens(e.title)) >= threshold;
  });
}
