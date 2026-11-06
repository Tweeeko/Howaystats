/**
 * THE HOWAYSTATS VOICE
 * --------------------
 * A Geordie talking to another Geordie about Sunderland. Every line is picked by the real football
 * situation (numbers are always passed in, never made up) and rotated by date so the site doesn't
 * repeat itself. Rules: dialect used lightly, dry not shouty, no Americanisms, don't explain the joke.
 * Geography: Newcastle — River Tyne, St James' Park. Sunderland — River Wear, Stadium of Light.
 */

export interface VoiceState {
  date: string; // YYYY-MM-DD — rotation seed
  sunPos: number;
  nufcPos: number;
  leagueSize: number;
  pRel?: number;
  pEurope?: number;
  jarPercent?: number;
  sunLastResult?: "W" | "D" | "L" | null;
  nufcLastResult?: "W" | "D" | "L" | null;
  sunForm?: string; // e.g. "LLDWL", oldest first
}

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

export function voice(v: VoiceState) {
  const sunBelow = v.sunPos > v.nufcPos;
  const inZone = v.sunPos > v.leagueSize - 3;
  const p = v.pRel ?? 0;
  const d = v.date;

  const weather =
    p >= 0.75 ? "Wearside forecast: tears, and plenty of them."
    : p >= 0.5 ? "Wearside forecast: heavy showers, mostly from the stands."
    : p >= 0.25 ? "Wearside forecast: drizzle, turning to moaning."
    : "Wearside forecast: dry. Annoyingly.";

  return {
    weather,

    rivalryHead: sunBelow
      ? pick([
          "Same region. Different planet.",
          "Twelve miles and a league of difference.",
          "The Tyne's black and white. The Wear's in bits.",
        ], d, "rh")
      : pick([
          "Aye, they're above us. Write it down, it won't last.",
          "They're ahead. Divvent ring the radio, we've seen it.",
        ], d, "rh"),

    tearsTitle: pick(["The Tears Index", "The Mackem Tears Index"], d, "tt"),
    tearsCaption:
      p >= 0.5 || inZone
        ? pick([
            "We measure how much their lot have got to cry about. This week: loads.",
            "Every figure's real. The tears are just implied.",
            "Their supporters' week, in numbers. Pass the tissues. Or don't.",
          ], d, "tc")
        : pick([
            "Quiet spell on the Wear. The index is patient.",
            "Not much to cry about lately. Give it a fortnight.",
          ], d, "tc"),

    dropZone: inZone
      ? pick([
          "Not everyone can handle the Premier League.",
          "The trapdoor's open and they're stood right on it.",
          "Gan on then, have a look at the bottom three.",
        ], d, "dz")
      : pick([
          "Peering over the edge. Divvent lean, lads.",
          "Not in the bottom three. Yet.",
        ], d, "dz"),

    europe: (v.pEurope ?? 0) >= 0.5
      ? pick(["Toon fans: dig your passports out.", "Newcastle are heading for Europe. Probably.", "European nights back at St James'? Looking that way."], d, "eu")
      : pick(["Newcastle and Europe: still a long walk.", "The Toon are still in the hunt for Europe. Just."], d, "eu"),

    woes: pick(["Wearside Woes", "News from the Wear"], d, "ww"),
    terrace: "The Terrace",

    bandLines: [
      weather.toUpperCase(),
      sunBelow ? "THE TYNE IS BLACK AND WHITE" : "THE TABLE DOESN'T LIE. EVEN WHEN WE'D LIKE IT TO",
      `SUNDERLAND ${ord(v.sunPos).toUpperCase()}${v.pRel !== undefined ? ` · ${Math.round(p * 100)}% TO GO DOWN` : ""}`,
      "WEAR THE BLACK AND WHITE. WATCH THE RED AND WHITE PANIC",
      `NEWCASTLE ${ord(v.nufcPos).toUpperCase()}${v.pEurope !== undefined ? ` · ${Math.round((v.pEurope ?? 0) * 100)}% EUROPE CHANCE` : ""}`,
      ...(v.jarPercent !== undefined ? [`TEARS INDEX ${Math.round(v.jarPercent)}%`] : []),
      ...(inZone ? ["NOT EVERYONE CAN HANDLE THE PREMIER LEAGUE"] : []),
      ...(v.sunLastResult === "L" ? ["SOMEONE CHECK ON SUNDERLAND. ACTUALLY, DIVVENT"] : []),
      ...(v.sunLastResult === "W" ? ["THEY WON. THEY'LL BE UNBEARABLE TILL TUESDAY"] : []),
    ],

    tableQuip: tableQuip(v.sunPos, v.nufcPos, v.leagueSize, d),
    formQuip: formQuip(v.sunForm ?? "", d),
  };
}

/** One line above the league table, aimed squarely at Sunderland's position. */
export function tableQuip(sunPos: number, nufcPos: number, n: number, seed: string) {
  const gap = sunPos - nufcPos;
  if (sunPos === n) return pick(["Sunderland are bottom. We've checked it twice and it's still lovely.", "Rock bottom on the Wear. Gan on, scroll down, have a look."], seed, "tq");
  if (sunPos > n - 3) return pick([`Sunderland ${ord(sunPos)}. That red line's there for a reason.`, `Sunderland in the bottom three. Scroll down, it's worth it.`], seed, "tq");
  if (gap > 6) return `Sunderland ${ord(sunPos)}. ${gap} places below us. Not that we're counting. We are.`;
  if (gap > 0) return `Sunderland ${ord(sunPos)}, ${gap} place${gap > 1 ? "s" : ""} below us. Closer than we'd like, mind.`;
  return `Sunderland ${ord(sunPos)}. Above us. Aye. We know. The table doesn't lie and neither do we.`;
}

/** Sunderland's last five, read out loud in the pub. Form string oldest first. */
export function formQuip(form: string, seed: string) {
  if (!form) return "";
  const w = (form.match(/W/g) ?? []).length;
  const l = (form.match(/L/g) ?? []).length;
  const lastTwo = form.slice(-2);
  if (w === 0 && l >= 3) return pick(["Not a win in five. Proper rough.", "Five games, no wins. Wearside's gone quiet."], seed, "fq");
  if (lastTwo === "WW") return pick(["Two on the bounce. They'll be planning the open-top bus.", "Back-to-back wins. Calm down, it's two games."], seed, "fq");
  if (form.endsWith("W")) return pick(["Won their last one. Unbearable till midweek.", "A win last time out. It happens."], seed, "fq");
  if (form.endsWith("D")) return pick(["Drew their last. Couldn't even lose properly.", "A draw. Wearside celebrations reached dangerous levels."], seed, "fq");
  return pick(["Lost their last. The phone-ins are rammed.", "Beaten last time out. Get in."], seed, "fq");
}

/** Head-to-head line for Tyne v Wear, from real derby results. */
export function h2hQuip(nufcWins: number, sunWins: number, draws: number) {
  const played = nufcWins + sunWins + draws;
  if (!played) return "No derby results stored yet. The Tyne is waiting.";
  if (nufcWins > sunWins) return `We've won ${nufcWins} of the ${played} on record. Aye, we'll keep mentioning it.`;
  if (sunWins > nufcWins) return `They've won ${sunWins} of the ${played} on record. Not our proudest chart. We print it anyway.`;
  return `Level on derby wins, ${nufcWins} each. Next one decides who gets to be insufferable.`;
}

/** Empty states and loading lines — the site never goes off-voice, even when there's nothing to show. */
export const EMPTY = {
  footballTitle: "Nowt loaded yet.",
  footballBody: "No made-up numbers here, ever. This fills in once the first data refresh has run.",
  woes: "Nothing's gone wrong on the Wear today. Yet. Give it time — we never make stories up, we just wait.",
  terrace: "The Terrace is quiet. No approved memes today and we're not faking one.",
  live: "Neither lot are playing right now. Live scores appear here the minute they kick off — never invented.",
  loading: ["Checking the table…", "Counting Mackem tears…", "Asking the Wear how it's getting on…", "Polishing the Tyne Bridge…"],
  error: "Summat's gone wrong. Rather than show you dodgy numbers, we've stopped it here.",
  notFound: "This page has gone down. Not unlike some clubs we could mention.",
};
