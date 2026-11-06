/**
 * THE HOWAYSTATS VOICE
 * --------------------
 * A Geordie talking to another Geordie about Sunderland. Every line is picked by the real football
 * situation (numbers are always passed in, never made up) and rotated by date so the site doesn't
 * repeat itself. Rules: dialect used lightly, dry not shouty, no Americanisms, don't explain the joke.
 * Geography: Newcastle — River Tyne, St James' Park. Sunderland — River Wear, Stadium of Light.
 */

export function pick<T>(arr: T[], seed: string, salt = ""): T {
  let h = 2166136261;
  for (const c of seed + salt) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return arr[h % arr.length];
}

export const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** One line above the league table, about where Sunderland are. */
export function tableQuip(sunPos: number, nufcPos: number, n: number, seed: string) {
  const gap = sunPos - nufcPos;
  if (sunPos === n) return pick(["Sunderland are bottom. Checked twice. Still fucking lovely. HAHAHA.", "Rock bottom on the Wear. Gan on, scroll down, have a look."], seed, "tq");
  if (sunPos > n - 3) return pick([`Sunderland ${ord(sunPos)}. That red line's there for a reason.`, `Sunderland in the bottom three. Scroll down and have a laugh.`], seed, "tq");
  if (gap > 6) return `Sunderland ${ord(sunPos)}. ${gap} places below us. Not that we're counting. We are.`;
  if (gap > 0) return `Sunderland ${ord(sunPos)}, ${gap} place${gap > 1 ? "s" : ""} below us. Closer than we'd like, mind. Still shite.`;
  return `Sunderland ${ord(sunPos)}. Above us. Fluke. It won't last.`;
}



/**
 * Sunderland are in the 2026/27 Europa League (first time in Europe since 1973) and play
 * Milan away on 10 December 2026. So the Milan line changes on that date instead of lying.
 */
export const MACKEMS_IN_MILAN = "2026-12-10";
export function milanLine(now: Date = new Date()) {
  return now.toISOString().slice(0, 10) < MACKEMS_IN_MILAN
    ? "Mackems in Milan? 10 December, on a Thursday. Flying from Newcastle Airport, mind. They haven't got one. HAHAHA."
    : "Mackems finally saw Milan. Flew from Newcastle Airport, obviously. We did it in the Champions League in 2023.";
}

/** Empty states and loading lines — the site never goes off-voice, even when there's nothing to show. */
export const EMPTY = {
  footballTitle: "Nowt loaded yet.",
  footballBody: "The scores haven't come through. We don't make numbers up, so this stays empty till they do.",
  loading: ["Checking the table…", "Asking the Wear how it's getting on…", "Putting the kettle on…"],
  error: "Summat's broken. Rather than show you dodgy numbers, we've stopped it here.",
  notFound: "This page has gone down. Not unlike some clubs we could mention.",
};

/**
 * THE PROPER WORDS. How Geordies actually talk about themselves and about Sunderland.
 * Used across the site's copy and fed to the AI writer. Football banter only:
 * the violent chants and anything about people's jobs or money are deliberately left out.
 */
export const GLOSSARY = {
  // Them
  sunderland: [
    { term: "SMB / sad Mackem bastards", use: "the classic Newcastle jibe for Sunderland fans; use sparingly, it lands harder" },
    { term: "Mackems", use: "Sunderland fans / people (from 'mak'em and tak'em', probably)" },
    { term: "the Wear / Wearside", use: "Sunderland's river and patch, never the Tyne" },
    { term: "Stadium of Light", use: "their ground; 'Stadium of Shite' in the pub" },
    { term: "haway", use: "how Mackems spell howay; mock the spelling, not the people" },
    { term: "Have you ever seen a Mackem in Milan?", use: "chant: they've never played in the San Siro, we have" },
    { term: "Will you fly from Newcastle?", use: "chant: their nearest airport is ours" },
    { term: "Who put the ball in the Mackems' net?", use: "chant: after we score against them" },
  ],
  // Us
  newcastle: [
    { term: "the Toon / the Toon Army", use: "Newcastle United and its fans" },
    { term: "wor lads / wor lot", use: "our team (wor = our)" },
    { term: "Howay the lads / HWTL", use: "the rallying cry" },
    { term: "UTM", use: "Up The Magpies" },
    { term: "Black and white army", use: "the chant" },
    { term: "St James' / the cathedral on the hill", use: "our ground" },
    { term: "the Gallowgate", use: "the end behind the goal; the loud bit" },
  ],
  // Talking
  dialect: [
    { term: "aye / nah", use: "yes / no" },
    { term: "why aye (man)", use: "of course" },
    { term: "howay (man)", use: "come on, at the start of a shout" },
    { term: "divvent / dinnet", use: "don't" },
    { term: "gan / gannin", use: "go / going" },
    { term: "nee / nowt / owt", use: "no / nothing / anything" },
    { term: "canny", use: "good, decent" },
    { term: "champion", use: "excellent" },
    { term: "proper", use: "really" },
    { term: "geet / howfing", use: "great / huge" },
    { term: "radgie", use: "furious, losing it" },
    { term: "marra", use: "mate" },
    { term: "gadgie", use: "bloke" },
    { term: "bairn", use: "child" },
    { term: "hyem", use: "home" },
    { term: "mortal", use: "very drunk" },
    { term: "scran / bait", use: "food / packed lunch" },
    { term: "clarty / hacky", use: "dirty, mucky" },
    { term: "on the hoy", use: "out drinking" },
    { term: "alreet", use: "alright" },
  ],
} as const;

/** One-line version for prompts. */
export const GLOSSARY_PROMPT = [
  "Them: " + GLOSSARY.sunderland.map((g) => `${g.term} (${g.use})`).join("; "),
  "Us: " + GLOSSARY.newcastle.map((g) => `${g.term} (${g.use})`).join("; "),
  "Words: " + GLOSSARY.dialect.map((g) => `${g.term} = ${g.use}`).join("; "),
].join("\n");
