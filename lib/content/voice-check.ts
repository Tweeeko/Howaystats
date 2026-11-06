import { jaccard, tokens } from "./dedupe";

/**
 * Editorial quality control for generated copy. Rejects stock AI phrasing, Americanisms,
 * shouty punctuation, dialect overload and headlines that just recycle the original.
 */
const AI_CLICHES = [
  "buckle up", "let's dive", "dive into", "in a stunning", "game-changer", "game changer", "it's safe to say", "needless to say",
  "in conclusion", "folks", "y'all", "rollercoaster", "testament to", "a reminder that", "only time will tell", "in the world of",
  "when it comes to", "at the end of the day", "fans everywhere", "unleash", "showcase", "elevate", "delve", "embark",
  "tapestry", "navigate", "landscape", "journey", "brace yourselves", "hold onto your", "you won't believe",
  "turn of events", "will be delighted", "the stage is set", "remains to be seen", "fascinating development", "it's worth noting",
  "make no mistake", "all eyes", "plot twist", "the beautiful game",
];
const SWEARS = /\b(fuck\w*|shite?|bollocks|piss\w*|gobshite|arse\w*|bastard\w*|twat\w*)\b/gi;
const AMERICANISMS = ["soccer", "awesome", "gotten", "cleats", "uniform", "roster", "sophomore", "zero-zero", "tie game", "a tie", "field goal", "the fall", "color", "favorite", "gonna", "dude", "defense", "offense", "center", "math", "vacation", "season opener"];
const DIALECT = ["aye", "nah", "gan on", "canny", "proper", "divvent", "wey aye", "howay", "pet", "like,", "bairn", "hinny", "summat", "nowt", "owt"];

export function voiceCheck(text: string, original?: string, opts: { isHeadline?: boolean } = {}): { ok: boolean; reason?: string } {
  const t = text.toLowerCase();
  for (const c of AI_CLICHES) if (t.includes(c)) return { ok: false, reason: `AI cliché: "${c}"` };
  for (const a of AMERICANISMS) if (new RegExp(`\\b${a.replace(/[-]/g, "[- ]")}\\b`).test(t)) return { ok: false, reason: `Americanism: "${a}"` };
  if ((text.match(/!/g) ?? []).length > 1) return { ok: false, reason: "too many exclamation marks" };
  if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) return { ok: false, reason: "emoji" };
  if ((text.match(SWEARS) ?? []).length > 2) return { ok: false, reason: "swearing for the sake of it" };
  const words = t.split(/\s+/).length || 1;
  const dialect = DIALECT.reduce((s, d) => s + (t.split(d).length - 1), 0);
  if (dialect / words > 0.12 && dialect > 2) return { ok: false, reason: "dialect overload — reads like a phrasebook" };
  if (original && opts.isHeadline && jaccard(tokens(text), tokens(original)) > 0.5) return { ok: false, reason: "headline recycles the original" };
  return { ok: true };
}
