import type { BanterFacts, ClubFacts } from "./facts";
import { ord, pick } from "../voice";

/**
 * Fact-driven banter in the HOWAYSTATS voice. Used when no AI key is configured, and whenever AI copy
 * fails the fact guard. Every line is filled only from facts. Sunderland never get a clean compliment.
 */

const scoreline = (c: ClubFacts) => (c.last ? `${c.last.goalsFor}-${c.last.goalsAgainst}` : "");
const outcome = (c: ClubFacts) =>
  !c.last ? null : c.last.goalsFor > c.last.goalsAgainst ? "W" : c.last.goalsFor === c.last.goalsAgainst ? "D" : "L";
const where = (c: ClubFacts) => (c.last?.competition ? ` in the ${c.last.competition}` : "");

export interface BanterLine {
  kind: "headline" | "post-match" | "misery-report" | "celebration" | "social";
  text: string;
}

export function templateBanter(f: BanterFacts): BanterLine[] {
  const out: BanterLine[] = [];
  const n = f.newcastle;
  const s = f.sunderland;
  const seed = f.date;

  // ── Newcastle ──
  const no = outcome(n);
  if (n.last && no === "W") {
    out.push({
      kind: "celebration",
      text: pick([
        `${scoreline(n)} against ${n.last.opponent}${where(n)}. Three points in the bag. Howay the lads.`,
        `Beat ${n.last.opponent} ${scoreline(n)}${where(n)}. Canny afternoon, that.`,
        `${n.last.opponent} sorted, ${scoreline(n)}. Wey aye.`,
      ], seed, "nw"),
    });
  } else if (n.last && no === "D") {
    out.push({ kind: "post-match", text: pick([`${scoreline(n)} with ${n.last.opponent}${where(n)}. A point. Gan on then.`, `Shared it with ${n.last.opponent}, ${scoreline(n)}. Not vintage. Not a disaster.`], seed, "nd") });
  } else if (n.last && no === "L") {
    out.push({ kind: "post-match", text: pick([`Lost ${scoreline(n)} to ${n.last.opponent}${where(n)}. Nah. Not having that. We go again.`, `${scoreline(n)} defeat to ${n.last.opponent}. Rough one. Still not as rough as being a Mackem.`], seed, "nl") });
  }

  if (s) {
    // ── Sunderland: win, lose or draw, there's always an angle ──
    const so = outcome(s);
    const L = s.last;
    if (L && so === "L") {
      out.push({
        kind: "headline",
        text: pick([
          `Sunderland lose ${L.goalsFor}-${L.goalsAgainst} to ${L.opponent}${where(s)}. Another three points donated. Generous lot.`,
          `${L.opponent} ${L.goalsAgainst}, Sunderland ${L.goalsFor}. The Stadium of Light could do with a dimmer switch.`,
          `Beaten by ${L.opponent}${where(s)}. Excuses available on the Wear from about five o'clock.`,
        ], seed, "sl"),
      });
    } else if (L && so === "W") {
      out.push({
        kind: "headline",
        text:
          L.goalsFor - L.goalsAgainst === 1
            ? pick([`Sunderland scrape past ${L.opponent} ${L.goalsFor}-${L.goalsAgainst}${where(s)}. Calm down, it's one game.`, `${L.goalsFor}-${L.goalsAgainst} against ${L.opponent}. They're acting like they've won the league.`], seed, "sw1")
            : pick([`Sunderland beat ${L.opponent} ${L.goalsFor}-${L.goalsAgainst}${where(s)}. We checked. Twice. Grim.`, `A Mackem win over ${L.opponent}. They'll be unbearable till Tuesday.`], seed, "sw2"),
      });
    } else if (L && so === "D") {
      out.push({ kind: "headline", text: pick([`Sunderland ${L.goalsFor}-${L.goalsAgainst} ${L.opponent}${where(s)}. Couldn't get the job done.`, `A ${L.goalsFor}-${L.goalsAgainst} draw with ${L.opponent}. On the Wear that's a parade.`], seed, "sd") });
    }

    if (s.position >= 18) {
      out.push({ kind: "misery-report", text: pick([`${ord(s.position)} in the table. Not everyone can handle the Premier League.`, `Sunderland ${ord(s.position)} on ${s.points} points. The bottom three isn't a trophy, lads.`], seed, "rz") });
    }

    if (s.pRelegation !== undefined) {
      const pct = Math.round(s.pRelegation * 100);
      out.push({
        kind: "social",
        text: pct >= 50 ? `Sunderland relegation chance: ${pct}%. HOWAYSTATS — the numbers don't lie.` : `Sunderland relegation chance: ${pct}%. Lower than we'd like. It's a long season, mind.`,
      });
    }

    const gap = n.points - s.points;
    if (gap > 0) out.push({ kind: "headline", text: pick([`${gap} points between us and them. Not that we're counting. We are.`, `${gap} points clear of the Wear. Lovely.`], seed, "gap") });
    else if (gap < 0) out.push({ kind: "headline", text: `Sunderland ${-gap} points above us. Aye. We know. The table doesn't lie and neither do we.` });
  }

  if (f.jarPercent !== undefined && s) {
    const j = Math.round(f.jarPercent);
    out.push({
      kind: "misery-report",
      text:
        j >= 70 ? `Tears Index at ${j}%. Full-on Wearside weeping.`
        : j >= 50 ? `Tears Index ${j}%. Lip's going on the Wear.`
        : j >= 30 ? `Tears Index ${j}%. Bit of a sniffle on Wearside.`
        : `Tears Index only ${j}%. Quiet spell. Give it a fortnight.`,
    });
  }
  if (f.miseryIndex !== undefined && s) {
    const m = f.miseryIndex;
    if (m >= 60) out.push({ kind: "headline", text: `Misery Index ${m}. Wearside meltdown, officially.` });
    else if (m < 20) out.push({ kind: "headline", text: `Misery Index down at ${m}. Let them enjoy it. It never lasts.` });
  }

  if (f.derbyNext) out.push({ kind: "headline", text: "Derby next. The Tyne is ours — gan on and prove it." });
  if (!out.length) out.push({ kind: "headline", text: `Newcastle ${ord(n.position)} on ${n.points} points. Howay the lads.` });
  return out;
}
