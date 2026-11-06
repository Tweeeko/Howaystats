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
  if (sunPos === n) return pick(["Sunderland are bottom. We've checked twice. Still lovely.", "Rock bottom on the Wear. Gan on, scroll down, have a look."], seed, "tq");
  if (sunPos > n - 3) return pick([`Sunderland ${ord(sunPos)}. That red line's there for a reason.`, `Sunderland in the bottom three. Scroll down, it's worth it.`], seed, "tq");
  if (gap > 6) return `Sunderland ${ord(sunPos)}. ${gap} places below us. Not that we're counting. We are.`;
  if (gap > 0) return `Sunderland ${ord(sunPos)}, ${gap} place${gap > 1 ? "s" : ""} below us. Closer than we'd like, mind.`;
  return `Sunderland ${ord(sunPos)}. Above us. Aye, we know. It won't last.`;
}



/** Empty states and loading lines — the site never goes off-voice, even when there's nothing to show. */
export const EMPTY = {
  footballTitle: "Nowt loaded yet.",
  footballBody: "The scores haven't come through. We don't make numbers up, so this stays empty till they do.",
  loading: ["Checking the table…", "Asking the Wear how it's getting on…", "Putting the kettle on…"],
  error: "Summat's broken. Rather than show you dodgy numbers, we've stopped it here.",
  notFound: "This page has gone down. Not unlike some clubs we could mention.",
};
