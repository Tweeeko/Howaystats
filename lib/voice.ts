/**
 * THE HOWAYSTATS VOICE — headline banks chosen by the real football situation, rotated by date so the
 * front page doesn't say the same thing every day. Jokes live here; numbers are always passed in from data.
 */
export interface VoiceState {
  date: string; // YYYY-MM-DD — rotation seed
  sunPos: number;
  nufcPos: number;
  leagueSize: number;
  pRel?: number; // Sunderland relegation probability
  pEurope?: number; // Newcastle top-seven probability
  jarPercent?: number;
  sunLastResult?: "W" | "D" | "L" | null;
  nufcLastResult?: "W" | "D" | "L" | null;
}

const pick = <T,>(arr: T[], seed: string, salt = "") => {
  let h = 2166136261;
  for (const c of seed + salt) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return arr[h % arr.length];
};

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function voice(v: VoiceState) {
  const sunBelow = v.sunPos > v.nufcPos;
  const inZone = v.sunPos > v.leagueSize - 3;
  const bad = (v.pRel ?? 0) >= 0.5 || inZone;
  const weather =
    (v.pRel ?? 0) >= 0.75 ? "Wearside weather: biblical. Bring a boat."
    : (v.pRel ?? 0) >= 0.5 ? "Wearside weather: heavy showers expected."
    : (v.pRel ?? 0) >= 0.25 ? "Wearside weather: drizzle, turning to tears."
    : "Wearside weather: dry, annoyingly.";

  return {
    weather,
    masthead: "The numbers don't lie.",
    rivalryHead: sunBelow
      ? pick(["The North East is black and white.", "Tale of the tape.", "Same river. Different league table."], v.date, "rh")
      : pick(["Aye, they're above us. Write it down, it won't last.", "The table says what the table says."], v.date, "rh"),
    tearDept: pick(["The Mackem Tear Department.", "Wearside's finest export."], v.date, "td"),
    tearCaption: bad
      ? pick([
          "Hand-collected on Wearside. Every drop earned.",
          "We'd say sorry. We're not.",
          "Somebody check on Sunderland. Actually, don't.",
          "Wear the black and white. Watch the red and white panic.",
        ], v.date, "tc")
      : pick(["Quiet week on Wearside. The jar is patient.", "Not much in it lately. It'll come."], v.date, "tc"),
    dropZone: inZone
      ? pick(["Not everyone can handle the Premier League.", "The trapdoor is open.", "Mind the gap. Then mind the drop."], v.date, "dz")
      : pick(["Peering over the edge.", "The trapdoor is just there, mind."], v.date, "dz"),
    europe: (v.pEurope ?? 0) >= 0.5
      ? pick(["Toon fans: pack your passports.", "Newcastle are heading for Europe. Probably.", "European nights back on Tyneside? Looking that way."], v.date, "eu")
      : pick(["Newcastle and Europe: still a long walk.", "The Toon are still in the hunt for Europe. Just."], v.date, "eu"),
    wire: "The HOWAYSTATS Wire",
    woes: pick(["Wearside Woes", "Wearside Woes: the latest"], v.date, "ww"),
    terrace: pick(["The Terrace", "The Terrace: overheard, screenshotted, shared"], v.date, "te"),
    bandLines: [
      weather.toUpperCase(),
      sunBelow ? "THE NORTH EAST IS BLACK AND WHITE" : "THE TABLE DOESN'T LIE. EVEN WHEN WE'D LIKE IT TO",
      `SUNDERLAND ${ord(v.sunPos).toUpperCase()}${v.pRel !== undefined ? ` · ${Math.round(v.pRel * 100)}% TO GO DOWN` : ""}`,
      "WEAR THE BLACK AND WHITE. WATCH THE RED AND WHITE PANIC",
      `NEWCASTLE ${ord(v.nufcPos).toUpperCase()}${v.pEurope !== undefined ? ` · ${Math.round(v.pEurope * 100)}% EUROPE CHANCE` : ""}`,
      ...(v.jarPercent !== undefined ? [`TEAR JAR ${Math.round(v.jarPercent)}% FULL`] : []),
      ...(inZone ? ["NOT EVERYONE CAN HANDLE THE PREMIER LEAGUE"] : []),
      ...(v.sunLastResult === "L" ? ["SOMEONE CHECK ON SUNDERLAND"] : []),
    ],
  };
}
