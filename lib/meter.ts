/**
 * THE MACKEM MISERY METER
 *
 * A quick look at how Sunderland are getting on, built from a handful of real numbers.
 * No weights, no made-up units. Each sign is either bad for them or it isn't, using a rule
 * anyone can check, and the meter is just how many bad signs there are.
 * Signs we can't measure (no derby yet, no attendance figure) are left out, not guessed.
 */
import type { Fixture } from "./types";

export const STADIUM_OF_LIGHT_CAPACITY = 49_000;
export const CAPACITY_SOURCE = { label: "Wikipedia: Stadium of Light", url: "https://en.wikipedia.org/wiki/Stadium_of_Light" };

export interface MeterSign {
  key: "position" | "form" | "conceded" | "run" | "derby" | "crowd";
  label: string;
  value: string;
  bad: boolean;
  line: string;
}

export interface Meter {
  bad: number;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
  levelName: string;
  /** The most specific line (used where the individual signs aren't listed). */
  verdict: string;
  /** A line for the overall level (used above the full list of signs, so nothing repeats). */
  summary: string;
  signs: MeterSign[];
  form: ("W" | "D" | "L")[];
}

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const words = ["none", "one", "two", "three", "four", "five"];
const say = (n: number) => words[n] ?? String(n);

interface Game {
  f: Fixture;
  home: boolean;
  gf: number;
  ga: number;
  r: "W" | "D" | "L";
  opp: number;
}

export function clubGames(fixtures: Fixture[], id: number): Game[] {
  return fixtures
    .filter((f) => f.status === "finished" && f.homeGoals !== null && f.awayGoals !== null && (f.homeId === id || f.awayId === id))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((f) => {
      const home = f.homeId === id;
      const gf = home ? f.homeGoals! : f.awayGoals!;
      const ga = home ? f.awayGoals! : f.homeGoals!;
      return { f, home, gf, ga, r: gf > ga ? "W" : gf === ga ? "D" : "L", opp: home ? f.awayId : f.homeId } as Game;
    });
}

export function mackemMeter(opts: {
  /** Every Sunderland fixture this season, all competitions. */
  fixtures: Fixture[];
  sunderlandId: number;
  newcastleId: number;
  position: number | null;
  leagueSize: number;
}): Meter {
  const { sunderlandId: sun, newcastleId: nufc, position, leagueSize: n } = opts;
  const games = clubGames(opts.fixtures, sun);
  const last5 = games.slice(-5);
  const form = last5.map((g) => g.r);
  const signs: MeterSign[] = [];

  // League position
  if (position) {
    const inZone = position > n - 3;
    const top = position <= 4;
    signs.push({
      key: "position",
      label: "League position",
      value: `${ord(position)} of ${n}`,
      bad: inZone,
      line: inZone
        ? "Bottom three. The Championship's ringing. Pick up, ya sad Mackem bastards. HAHAHA."
        : position >= n - 5
          ? "One wobble off the trapdoor. Shitting it on the Wear."
          : top
            ? "Up near the top. Fluke. They always bottle it, the daft bastards."
            : position <= 10
              ? "Top half. Insufferable. Fuck the Mackems, it won't last."
              : "Mid-table. Shite and forgettable. Peak Sunderland.",
    });
  }

  // Last five
  if (last5.length) {
    const wins = form.filter((r) => r === "W").length;
    signs.push({
      key: "form",
      label: `Last ${last5.length}`,
      value: form.join(" "),
      bad: last5.length >= 3 && wins <= 1,
      line:
        wins === 0
          ? `${say(last5.length)[0].toUpperCase() + say(last5.length).slice(1)} games, no wins. Absolutely fucking dire. HAHAHA.`
          : wins === 1
            ? `${say(last5.length)[0].toUpperCase() + say(last5.length).slice(1)} games, one win. One. Fucking shite.`
            : wins >= 4
              ? "Winning everything. Disgusting. Fuck the Mackems, it won't last."
              : `${say(wins)[0].toUpperCase() + say(wins).slice(1)} wins in ${say(last5.length)}. Fucking annoying. Give it a week, they'll bottle it.`,
    });
  }

  // Goals conceded, last five
  if (last5.length) {
    const ga = last5.reduce((s, g) => s + g.ga, 0);
    signs.push({
      key: "conceded",
      label: `Conceded, last ${last5.length}`,
      value: String(ga),
      bad: ga >= 2 * last5.length,
      line:
        ga >= 2 * last5.length
          ? "Their keeper's spent more time picking it out the net than catching it. HAHAHA."
          : ga === 0
            ? "Not conceded. Must be a fucking typo."
            : "Back line holding up. For now. Give it a minute.",
    });
  }

  // Consecutive defeats / winless run (only shown when there is one)
  let losing = 0;
  for (let i = games.length - 1; i >= 0 && games[i].r === "L"; i--) losing++;
  let winless = 0;
  for (let i = games.length - 1; i >= 0 && games[i].r !== "W"; i--) winless++;
  if (losing >= 2) {
    signs.push({ key: "run", label: "Defeats in a row", value: String(losing), bad: true, line: losing >= 4 ? `${losing} defeats on the bounce. Someone check on the sad Mackem bastards.` : `${say(losing)[0].toUpperCase() + say(losing).slice(1)} defeats on the bounce. Proper habit now. HAHAHA.` });
  } else if (winless >= 4) {
    signs.push({ key: "run", label: "Games without a win", value: String(winless), bad: true, line: `${winless} without a win. Mackems ringing talkSPORT in tears. HAHAHA.` });
  }

  // Derbies this season
  const derbies = games.filter((g) => g.opp === nufc);
  if (derbies.length) {
    const last = derbies[derbies.length - 1];
    const lost = derbies.filter((g) => g.r === "L").length;
    signs.push({
      key: "derby",
      label: "Derbies this season",
      value: derbies.map((g) => `${g.home ? `SUN ${g.gf}-${g.ga} NEW` : `NEW ${g.ga}-${g.gf} SUN`}`).join(" · "),
      bad: last.r === "L",
      line: last.r === "L" ? (lost === derbies.length ? "Battered by us every time. Who put the ball in the Mackems' net?" : "Lost the last one to us. Fuck the Mackems. SMB.") : last.r === "D" ? "Drew the last one. Still shite." : "They won the last one. We're not talking about it.",
    });
  }

  // Last home crowd (only if the data supplier gave us a figure)
  const homeWithGate = games.filter((g) => g.home && typeof g.f.attendance === "number" && g.f.attendance > 0);
  const gate = homeWithGate[homeWithGate.length - 1];
  if (gate) {
    const full = gate.f.attendance! / STADIUM_OF_LIGHT_CAPACITY;
    signs.push({
      key: "crowd",
      label: "Last home crowd",
      value: `${gate.f.attendance!.toLocaleString("en-GB")} (${Math.round(full * 100)}%)`,
      bad: full < 0.9,
      line: full < 0.9 ? "Empty seats everywhere. Even the Mackems can't watch that shite." : "Near enough full. Paying to watch that. Mugs.",
    });
  }

  const bad = signs.filter((s) => s.bad).length;
  const total = signs.length;
  const ratio = total ? bad / total : 0;
  const level = (total === 0 ? 0 : bad === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4) as Meter["level"];
  const levelName = ["Annoyingly fine", "Starting to wobble", "Bricking it", "Proper fucked", "Fucked. HAHAHA"][level];
  const worst = signs.find((s) => s.bad && (s.key === "run" || s.key === "form")) ?? signs.find((s) => s.bad);
  const verdict = !total
    ? "No games yet. The misery's coming. HAHAHA."
    : level === 0
      ? "Nowt to laugh at right now. Give it a fortnight, they always bottle it."
      : worst?.line ?? "Another day on Wearside, another kick in the knackers. HAHAHA.";
  const summary = !total
    ? "No games yet. The misery's coming. HAHAHA."
    : [
        "Nowt to laugh at right now. Give it a fortnight, they always bottle it.",
        "Starting to wobble on the Wear. Here we go.",
        "Another day on Wearside, another kick in the knackers. HAHAHA.",
        "Well, that's another lovely week for the sad Mackem bastards.",
        "Never mind the league table. Have a look at the fucking state of that. HAHAHA.",
      ][level];
  return { bad, total, level, levelName, verdict, summary, signs, form };
}
