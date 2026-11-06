import type { Fixture } from "../types";
import { countsTowardsTable, uniqueById } from "../football/standings";

/**
 * THE TEARS INDEX — how much Sunderland's SUPPORTERS have got to cry about.
 * --------------------------------------------------------------------------
 * Built from measurable indicators only. Each one carries its source. If a figure isn't
 * publicly available from our data supplier (TV audiences, away following, and attendance on
 * plans that don't include it) it's shown as unavailable and simply left out of the score.
 * Nothing here is estimated or invented.
 */

export const STADIUM_OF_LIGHT_CAPACITY = 49_000;
export const CAPACITY_SOURCE = { label: "Wikipedia: Stadium of Light", url: "https://en.wikipedia.org/wiki/Stadium_of_Light" };

export interface TearIndicator {
  key: string;
  label: string;
  value: string; // display value, or "Unavailable"
  available: boolean;
  score: number; // 0..1 contribution before weighting (0 when unavailable)
  weight: number;
  source: string;
  sourceUrl?: string;
  line: string; // Geordie commentary built from the figure
}

export interface TearsIndex {
  percent: number; // 0..100
  tears: number; // fictional, = percent × 1,000 — clearly labelled as made up
  indicators: TearIndicator[];
  available: number;
  latest: string | null; // the most recent thing that gave them something to cry about
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const MATCH_SOURCE = "Match results from our data supplier";

interface Res { f: Fixture; gf: number; ga: number; home: boolean; opp: number; r: "W" | "D" | "L" }

function results(fixtures: Fixture[], id: number): Res[] {
  return uniqueById(fixtures)
    .filter(countsTowardsTable)
    .filter((f) => f.homeId === id || f.awayId === id)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((f) => {
      const home = f.homeId === id;
      const gf = home ? f.homeGoals! : f.awayGoals!;
      const ga = home ? f.awayGoals! : f.homeGoals!;
      return { f, gf, ga, home, opp: home ? f.awayId : f.homeId, r: gf > ga ? "W" : gf === ga ? "D" : "L" };
    });
}

export function tearsIndex(opts: {
  leagueFixtures: Fixture[];
  cupFixtures?: Fixture[];
  sunderlandId: number;
  newcastleId: number;
  nameOf?: (id: number) => string;
  totalGames?: number;
}): TearsIndex {
  const { sunderlandId: sun, newcastleId: nufc } = opts;
  const nameOf = opts.nameOf ?? ((id: number) => `Club ${id}`);
  const league = results(opts.leagueFixtures.filter((f) => (f.leagueId ?? 39) === 39), sun);
  const all = results([...opts.leagueFixtures, ...(opts.cupFixtures ?? [])], sun);
  const ind: TearIndicator[] = [];

  // 1. Winless run, every competition.
  let winless = 0;
  for (const g of [...all].reverse()) {
    if (g.r === "W") break;
    winless++;
  }
  ind.push({
    key: "winless",
    label: "Games without a win",
    value: all.length ? `${winless}` : "Unavailable",
    available: all.length > 0,
    score: clamp01(winless / 8),
    weight: 1.2,
    source: MATCH_SOURCE,
    line:
      winless === 0 ? "They won their last one. Divvent worry, it'll pass."
      : winless < 3 ? `${winless} without a win. The moaning's just warming up.`
      : winless < 6 ? `${winless} without a win. Phone-ins on Wearside are proper busy.`
      : `${winless} without a win. Somebody check on them. Actually, divvent.`,
  });

  // 2. Points thrown away from winning positions (league). Measured from half-time leads —
  //    our data has half-time scores, not every minute, so leads lost within a half aren't counted.
  const withHt = league.filter((g) => g.f.htHome !== null && g.f.htAway !== null);
  let thrown = 0, blown = 0;
  for (const g of withHt) {
    const htFor = g.home ? g.f.htHome! : g.f.htAway!;
    const htAg = g.home ? g.f.htAway! : g.f.htHome!;
    if (htFor > htAg && g.r !== "W") {
      blown++;
      thrown += g.r === "D" ? 2 : 3;
    }
  }
  ind.push({
    key: "blown-leads",
    label: "Points thrown away from half-time leads",
    value: withHt.length ? `${thrown}` : "Unavailable",
    available: withHt.length > 0,
    score: clamp01(thrown / 10),
    weight: 1,
    source: `${MATCH_SOURCE} (half-time and full-time scores)`,
    line: !withHt.length ? "No half-time scores in our feed for their games yet. No figure, no joke." : blown === 0 ? "Not bottled a half-time lead yet. Give them time." : `Bottled ${blown} half-time lead${blown > 1 ? "s" : ""}. Wey aye, that'll sting.`,
  });

  // 3. Defeats in the last five, every competition.
  const last5 = all.slice(-5);
  const losses = last5.filter((g) => g.r === "L").length;
  ind.push({
    key: "recent-defeats",
    label: "Defeats in their last five",
    value: last5.length ? `${losses} of ${last5.length}` : "Unavailable",
    available: last5.length > 0,
    score: last5.length ? losses / 5 : 0,
    weight: 1.2,
    source: MATCH_SOURCE,
    line: losses >= 4 ? "Four or more in five. Absolute shambles." : losses >= 2 ? "Losing's becoming a habit." : "Hardly losing lately. Annoying, that.",
  });

  // 4. Goals conceded in the last five.
  const conceded = last5.reduce((s, g) => s + g.ga, 0);
  ind.push({
    key: "conceded",
    label: "Goals conceded in their last five",
    value: last5.length ? `${conceded}` : "Unavailable",
    available: last5.length > 0,
    score: clamp01(conceded / 12),
    weight: 0.8,
    source: MATCH_SOURCE,
    line: conceded >= 10 ? "Their keeper's got a stiff neck from picking it out the net." : conceded >= 6 ? "Leaking like a Wearside roof." : "Tight at the back. For them, like.",
  });

  // 5. Derby defeats to Newcastle this season.
  const derbies = all.filter((g) => g.opp === nufc);
  const derbyLosses = derbies.filter((g) => g.r === "L").length;
  ind.push({
    key: "derbies",
    label: "Derby defeats to Newcastle this season",
    value: derbies.length ? `${derbyLosses} of ${derbies.length}` : "None played yet",
    available: derbies.length > 0,
    score: derbies.length ? derbyLosses / derbies.length : 0,
    weight: 1.5,
    source: MATCH_SOURCE,
    line: !derbies.length ? "No derby yet. The Tyne is waiting." : derbyLosses === derbies.length ? "Every derby lost. The Tyne is ours." : derbyLosses ? `Lost ${derbyLosses === 1 ? "one" : derbyLosses} to us. They'll be hearing about it for years.` : "They haven't lost one to us this season. We're not talking about it.",
  });

  // 6. Last home attendance vs capacity (only when the supplier provides attendance).
  const homes = all.filter((g) => g.home);
  const withGate = homes.filter((g) => typeof g.f.attendance === "number" && g.f.attendance! > 0);
  const lastGate = withGate[withGate.length - 1];
  const emptyShare = (n: number) => Math.max(0, 1 - n / STADIUM_OF_LIGHT_CAPACITY);
  ind.push({
    key: "last-gate",
    label: "Last home crowd at the Stadium of Light",
    value: lastGate ? `${lastGate.f.attendance!.toLocaleString("en-GB")} (${Math.round(100 * (1 - emptyShare(lastGate.f.attendance!)))}% full)` : "Unavailable",
    available: !!lastGate,
    score: lastGate ? clamp01(emptyShare(lastGate.f.attendance!) / 0.25) : 0,
    weight: 0.8,
    source: lastGate ? `Official attendance via our data supplier; capacity ${STADIUM_OF_LIGHT_CAPACITY.toLocaleString("en-GB")} (${CAPACITY_SOURCE.label})` : "Our data supplier's current plan doesn't include attendances",
    sourceUrl: lastGate ? CAPACITY_SOURCE.url : undefined,
    line: !lastGate ? "No official figure from our data feed, so we're not guessing." : emptyShare(lastGate.f.attendance!) > 0.1 ? "Plenty of empty seats. Can't say we blame them." : "Near enough full. Glutton for punishment, that lot.",
  });

  // 7. Average home crowd this season.
  const avg = withGate.length ? withGate.reduce((s, g) => s + g.f.attendance!, 0) / withGate.length : 0;
  ind.push({
    key: "avg-gate",
    label: "Average home crowd this season",
    value: withGate.length ? `${Math.round(avg).toLocaleString("en-GB")} (${Math.round((100 * avg) / STADIUM_OF_LIGHT_CAPACITY)}% of capacity)` : "Unavailable",
    available: withGate.length > 0,
    score: withGate.length ? clamp01(emptyShare(avg) / 0.25) : 0,
    weight: 0.5,
    source: withGate.length ? "Official attendances via our data supplier" : "Not provided by our data supplier",
    sourceUrl: withGate.length ? CAPACITY_SOURCE.url : undefined,
    line: withGate.length ? "The number they'll quote at you in the pub. Check it here." : "Not in our data feed. No figure, no joke.",
  });

  // 8–9. Things we'd love to measure but can't do honestly.
  ind.push({ key: "away", label: "Away following", value: "Unavailable", available: false, score: 0, weight: 0, source: "No reliable public source", line: "No official numbers published, so we're not making any up." });
  ind.push({ key: "tv", label: "TV audience when they lose", value: "Unavailable", available: false, score: 0, weight: 0, source: "Broadcasters don't publish per-match figures", line: "We'd love this one. Nobody publishes it, so neither do we." });

  // 10. League points dropped this season (out of the 76 they can afford to drop and still reach 38).
  const totalGames = opts.totalGames ?? 38;
  const capacity = 3 * totalGames - 38;
  const dropped = league.reduce((s, g) => s + (g.r === "W" ? 0 : g.r === "D" ? 2 : 3), 0);
  ind.push({
    key: "dropped",
    label: "League points dropped",
    value: league.length ? `${dropped} of ${capacity}` : "Unavailable",
    available: league.length > 0,
    score: clamp01(dropped / capacity),
    weight: 1,
    source: MATCH_SOURCE,
    line: dropped > capacity ? "38 points is gone. Mathematically. Ta-ra." : `${dropped} gone from ${league.length * 3} available. They can spare ${capacity} all season and still reach 38. ${capacity - dropped} left.`,
  });

  const counted = ind.filter((i) => i.available && i.weight > 0);
  const wsum = counted.reduce((s, i) => s + i.weight, 0);
  const percent = wsum ? Math.round((1000 * counted.reduce((s, i) => s + i.weight * i.score, 0)) / wsum) / 10 : 0;

  const last = all[all.length - 1];
  const comp = last && (last.f.leagueId ?? 39) !== 39 ? ` in the ${last.f.competition ?? "cup"}` : "";
  const latest = !last
    ? null
    : last.r === "L"
      ? `Lost ${last.gf}-${last.ga} to ${nameOf(last.opp)}${comp}. Tissues out.`
      : last.r === "D"
        ? `Drew ${last.gf}-${last.ga} with ${nameOf(last.opp)}${comp}. Couldn't even lose properly.`
        : `Beat ${nameOf(last.opp)} ${last.gf}-${last.ga}${comp}. Enjoy it, lads. It won't last.`;

  return { percent, tears: Math.round(percent * 1000), indicators: ind, available: counted.length, latest };
}

/** Tears Index level wording — the supporters' state, in our words. */
export function tearsLabel(p: number) {
  if (p >= 90) return "Inconsolable. Proper inconsolable.";
  if (p >= 70) return "Full-on Wearside weeping.";
  if (p >= 50) return "Lip's going on Wearside.";
  if (p >= 30) return "Bit of a sniffle.";
  if (p >= 10) return "Grumbling, mostly.";
  return "Dry-eyed. Enjoy it while it lasts, lads.";
}
