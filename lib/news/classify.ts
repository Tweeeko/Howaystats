/**
 * Relevance, story type and category for discovered headlines.
 * Every genuine Sunderland AFC football story qualifies — good news or bad — because there's always
 * an angle. Newcastle stories are kept separately. Non-football "Sunderland" stories are ignored.
 */

export type NewsCategory =
  | "mackem-meltdowns"
  | "sunderland-slump"
  | "championship-watch"
  | "wearside-woes"
  | "latest-humiliation"
  | "sunderland-in-crisis"
  | "carried-away"
  | "transfer-comedy"
  | "newcastle-glory"
  | "newcastle-news";

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  "latest-humiliation": "The Latest Embarrassment",
  "sunderland-slump": "Sunderland Slump",
  "championship-watch": "Championship Watch",
  "mackem-meltdowns": "Mackem Meltdowns",
  "sunderland-in-crisis": "The Circus",
  "wearside-woes": "Wearside Woes",
  "carried-away": "Mackems Get Carried Away",
  "transfer-comedy": "Transfer Window Comedy",
  "newcastle-glory": "Newcastle Glory",
  "newcastle-news": "Newcastle News",
};

export type StoryType = "loss" | "win" | "draw" | "signing" | "sacking" | "appointment" | "injury" | "relegation" | "crisis" | "good-news" | "other";

const SUNDERLAND = /\bsunderland\b|\bblack cats\b|\bstadium of light\b|\bmackems?\b|\bwearside\b/i;
const NOT_THE_CLUB =
  /\bsunderland (city council|council|university|hospital|echo awards|airshow|marathon|ladies|women|rfc|cricket)\b|\bcricket\b|\brugby\b/i;
const NEWCASTLE = /\bnewcastle( united)?\b|\bmagpies\b|\bst james'? park\b|\btoon\b/i;
const NEWCASTLE_GOOD = /\b(newcastle|magpies|toon)\b[^.]{0,40}\b(win|wins|won|beat|thrash|cruise|victory|top four|europe|champions league|sign|signs|clean sheet)\b/i;

const TYPES: { t: StoryType; re: RegExp }[] = [
  { t: "sacking", re: /\b(sack(ed|ing)?|axed|dismissed|parts? ways|leaves? the club|relieved of)\b/i },
  { t: "appointment", re: /\b(appoint(ed|s)?|new (head coach|manager)|named (head coach|manager))\b/i },
  { t: "signing", re: /\b(sign(s|ed|ing)?|transfer|deal for|bid for|loan move|joins?|fee)\b/i },
  { t: "injury", re: /\b(injur\w*|ruled out|sidelined|hamstring|knee|ankle|surgery|fitness doubt)\b/i },
  { t: "relegation", re: /\b(relegat\w*|drop zone|bottom of the|rock bottom|bottom three|bottom club|survival)\b/i },
  { t: "crisis", re: /\b(crisis|turmoil|chaos|in disarray|under pressure|under fire|fury|furious|slams?|blasts?|row)\b/i },
  { t: "loss", re: /\b(defeat|lose|loses|lost|beaten|thrashed|hammered|humiliat\w*|losing run)\b/i },
  { t: "draw", re: /\b(draw|drew|stalemate|held|share the spoils|goalless)\b/i },
  { t: "win", re: /\b(win|wins|won|beat|victory|edge|stun|cruise|clinch|triumph)\b/i },
];

const CATEGORY_FOR: Record<StoryType, NewsCategory> = {
  loss: "sunderland-slump",
  relegation: "championship-watch",
  sacking: "sunderland-in-crisis",
  crisis: "mackem-meltdowns",
  appointment: "sunderland-in-crisis",
  injury: "wearside-woes",
  signing: "transfer-comedy",
  win: "carried-away",
  draw: "carried-away",
  "good-news": "carried-away",
  other: "wearside-woes",
};

const HEAVY = /\b(thrash|hammer|humiliat|embarrass|rout|demolish|battered|thumped|crushed|[4-9]-0)\w*/i;

export interface Classification {
  aboutSunderland: boolean;
  aboutNewcastle: boolean;
  storyType: StoryType;
  negativity: number; // 0..1, how bad the news is for Sunderland
  category: NewsCategory | null;
}

export function classifyStory(title: string, summary = ""): Classification {
  const text = `${title}. ${summary}`;
  const aboutSunderland = SUNDERLAND.test(text) && !NOT_THE_CLUB.test(text);
  const aboutNewcastle = NEWCASTLE.test(text);

  let storyType: StoryType = "other";
  // Who beat whom matters: "Chelsea beat Sunderland" is a defeat, "Sunderland beat Chelsea" a win.
  if (/\b(beat|beats|thrash\w*|hammer\w*|stun\w*|edge\w*|batter\w*|down\w*|sink\w*)\s+(struggling\s+|bottom[- ]club\s+)?sunderland\b/i.test(title)) storyType = "loss";
  else if (/\bsunderland\s+(beat|beats|edge|edges|stun|stuns|thrash|cruise|win|wins|won)\b/i.test(title)) storyType = "win";
  if (storyType === "other") for (const { t, re } of TYPES) {
    if (re.test(title)) {
      storyType = t;
      break;
    }
  }
  if (storyType === "other") for (const { t, re } of TYPES) if (re.test(summary)) { storyType = t; break; }
  if (storyType === "other" && /\b(boost|record|praise|award|returns?|back in training|unbeaten)\b/i.test(text)) storyType = "good-news";

  const bad: StoryType[] = ["loss", "relegation", "sacking", "crisis", "injury"];
  const negativity = bad.includes(storyType) ? (HEAVY.test(text) ? 1 : 0.7) : storyType === "draw" ? 0.4 : storyType === "other" ? 0.3 : 0.1;

  let category: NewsCategory | null = null;
  if (aboutSunderland) category = storyType === "loss" && HEAVY.test(text) ? "latest-humiliation" : CATEGORY_FOR[storyType];
  else if (aboutNewcastle) category = NEWCASTLE_GOOD.test(text) ? "newcastle-glory" : "newcastle-news";

  return { aboutSunderland, aboutNewcastle, storyType, negativity, category };
}

/** Editorial angle for the rewrite, by story type. Facts stay intact; the angle is where the joke lives. */
export const ANGLES: Record<StoryType, string> = {
  loss: "They lost. Make the most of it: the result, the mistakes, any excuses actually reported, and the misery. Brutal but factual.",
  win: "They won. Do NOT congratulate them. Find the angle: was it scrappy, against modest opposition, overdue, or are they getting carried away? Only use details in the source.",
  draw: "They drew. Make the most of the fact they couldn't get the job done.",
  signing: "A signing or transfer story. Question the expectations, the fit, or what he's let himself in for — without inventing a fee, quote or fact.",
  sacking: "A manager or coach has gone. Treat it as another episode in the ongoing Wearside circus. No personal attacks on the individual.",
  appointment: "A new appointment. Wish him luck — he'll need it. Keep it about the club, not personal.",
  injury: "An injury. Mock the club's luck and squad situation, NEVER the injured player or the injury itself.",
  relegation: "Relegation talk. Lean into the Championship countdown, using only the reported facts.",
  crisis: "Turmoil, pressure or a row. Another day in the circus. Only what's reported.",
  "good-news": "Good news for them. Find a genuinely funny angle without inventing anything negative — grudging, dry, sarcastic.",
  other: "A general Sunderland story. Find the funniest legitimate angle from a Newcastle supporter's view.",
};
