/**
 * Relevance + tone classification for discovered headlines.
 * Deliberately conservative: a story only reaches the Mackem Newsroom if it is
 * clearly about Sunderland AFC AND reads as bad news on football grounds.
 */

export type NewsCategory =
  | "mackem-meltdowns"
  | "sunderland-slump"
  | "championship-watch"
  | "wearside-woes"
  | "latest-humiliation"
  | "sunderland-in-crisis"
  | "newcastle-glory"
  | "newcastle-news";

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  "mackem-meltdowns": "Mackem Meltdowns",
  "sunderland-slump": "Sunderland Slump",
  "championship-watch": "Championship Watch",
  "wearside-woes": "Wearside Woes",
  "latest-humiliation": "The Latest Embarrassment",
  "sunderland-in-crisis": "Sunderland in Crisis",
  "newcastle-glory": "Newcastle Glory",
  "newcastle-news": "Newcastle News",
};

const SUNDERLAND = /\bsunderland\b|\bblack cats\b|\bstadium of light\b|\bmackems?\b|\bwearside\b/i;
const NOT_THE_CLUB =
  /\bsunderland (city council|council|university|hospital|echo awards|airshow|marathon|ladies)\b|\bsunderland rfc\b|\bcricket\b/i;
const NEWCASTLE = /\bnewcastle( united)?\b|\bmagpies\b|\bst james'? park\b|\btoon\b/i;

const RULES: { cat: NewsCategory; re: RegExp; weight: number }[] = [
  { cat: "latest-humiliation", re: /\b(thrash|hammer|humiliat|embarrass|rout|demolish|battered|thumped|crushed|[4-9]-0)\w*/i, weight: 3 },
  { cat: "championship-watch", re: /\b(relegat\w*|drop zone|bottom of the|rock bottom|bottom three|bottom club|survival|championship return)\b/i, weight: 3 },
  { cat: "sunderland-in-crisis", re: /\b(crisis|turmoil|chaos|in disarray|sack race|on the brink)\b/i, weight: 3 },
  { cat: "mackem-meltdowns", re: /\b(sack\w*|pressure|under fire|crisis|fury|furious|slams?|blasts?|meltdown|row|criticis\w*|axe\w*)\b/i, weight: 2 },
  { cat: "wearside-woes", re: /\b(injur\w*|ruled out|blow|setback|sidelined|suspended|suspension|ban(ned)?|transfer (snub|blow)|rejects?|snubs?)\b/i, weight: 2 },
  { cat: "sunderland-slump", re: /\b(defeat|lose|loses|lost|beaten|winless|slump|poor|dismal|woeful|errors?|without a win|losing run|struggl\w*|draw)\b/i, weight: 1 },
];

const NEWCASTLE_GOOD = /\b(newcastle|magpies|toon)\b[^.]{0,40}\b(win|wins|won|beat|thrash|cruise|victory|top four|europe|champions league|sign|signs|clean sheet)\b/i;
const POSITIVE_FOR_SUNDERLAND = /\b(sunderland (win|beat|stun|thrash|cruise|edge)|win for sunderland|sunderland (climb|move up|up to))\b/i;

export interface Classification {
  aboutSunderland: boolean;
  aboutNewcastle: boolean;
  negativity: number; // 0..1
  category: NewsCategory | null;
}

export function classifyStory(title: string, summary = ""): Classification {
  const text = `${title}. ${summary}`;
  const aboutSunderland = SUNDERLAND.test(text) && !NOT_THE_CLUB.test(text);
  const aboutNewcastle = NEWCASTLE.test(text);

  let score = 0;
  let best: { cat: NewsCategory; w: number } | null = null;
  for (const r of RULES) {
    if (r.re.test(title) || r.re.test(summary)) {
      score += r.weight * (r.re.test(title) ? 1 : 0.5);
      if (!best || r.weight > best.w) best = { cat: r.cat, w: r.weight };
    }
  }
  if (POSITIVE_FOR_SUNDERLAND.test(text)) score -= 3;
  const negativity = Math.max(0, Math.min(1, score / 5));

  let category: NewsCategory | null = null;
  if (aboutSunderland && negativity >= 0.2 && best) category = best.cat;
  else if (!aboutSunderland && aboutNewcastle) category = NEWCASTLE_GOOD.test(text) ? "newcastle-glory" : "newcastle-news";

  return { aboutSunderland, aboutNewcastle, negativity, category };
}
