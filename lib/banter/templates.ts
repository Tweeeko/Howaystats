import type { BanterFacts, ClubFacts } from "./facts";

/**
 * Deterministic, fact-driven banter. Used when no AI key is configured, and as the
 * fallback whenever AI copy fails the fact guard. Every line is filled only from facts.
 */

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const pick = <T,>(arr: T[], seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
};

const scoreline = (c: ClubFacts) => (c.last ? `${c.last.goalsFor}-${c.last.goalsAgainst}` : "");
const outcome = (c: ClubFacts) =>
  !c.last ? null : c.last.goalsFor > c.last.goalsAgainst ? "W" : c.last.goalsFor === c.last.goalsAgainst ? "D" : "L";

export interface BanterLine {
  kind: "headline" | "post-match" | "misery-report" | "celebration" | "social";
  text: string;
}

export function templateBanter(f: BanterFacts): BanterLine[] {
  const out: BanterLine[] = [];
  const n = f.newcastle;
  const s = f.sunderland;
  const seed = f.date;

  // Newcastle post-match
  const no = outcome(n);
  if (n.last && no === "W") {
    out.push({
      kind: "celebration",
      text: pick(
        [
          `${scoreline(n)} against ${n.last.opponent}. Three points in the bag. Howay the lads.`,
          `Beat ${n.last.opponent} ${scoreline(n)}. Up to ${ord(n.position)} and the Toon are purring.`,
          `${n.last.opponent} dispatched, ${scoreline(n)}. Get the kettle on, it's a good week on Tyneside.`,
        ],
        seed + "nw",
      ),
    });
  } else if (n.last && no === "D") {
    out.push({
      kind: "post-match",
      text: pick(
        [
          `${scoreline(n)} with ${n.last.opponent}. A point's a point. Moving on.`,
          `Shared the spoils with ${n.last.opponent}, ${scoreline(n)}. Not vintage, not a disaster.`,
        ],
        seed + "nd",
      ),
    });
  } else if (n.last && no === "L") {
    out.push({
      kind: "post-match",
      text: pick(
        [
          `Lost ${scoreline(n)} to ${n.last.opponent}. Not ideal, lads. Still, at least it wasn't a Mackem afternoon.`,
          `${scoreline(n)} defeat to ${n.last.opponent}. We go again. Numbers don't lie, and these ones sting.`,
        ],
        seed + "nl",
      ),
    });
  }

  if (s) {
    const so = outcome(s);
    if (s.last && so === "L") {
      out.push({
        kind: "headline",
        text: pick(
          [
            `Another three points donated to ${s.last.opponent}. Generous lot, aren't they?`,
            `Sunderland lose ${s.last.goalsFor}-${s.last.goalsAgainst} to ${s.last.opponent}. Wearside's charity work continues.`,
            `${s.last.opponent} ${s.last.goalsAgainst}, Sunderland ${s.last.goalsFor}. The Stadium of Light could do with a dimmer switch.`,
          ],
          seed + "sl",
        ),
      });
    } else if (s.last && so === "W") {
      out.push({
        kind: "headline",
        text: pick(
          [
            `Sunderland actually won, ${s.last.goalsFor}-${s.last.goalsAgainst} against ${s.last.opponent}. We checked the data twice. It's real. Grim.`,
            `A Mackem win over ${s.last.opponent}. Statistically it was bound to happen eventually.`,
          ],
          seed + "sw",
        ),
      });
    } else if (s.last && so === "D") {
      out.push({
        kind: "headline",
        text: `Sunderland ${s.last.goalsFor}-${s.last.goalsAgainst} ${s.last.opponent}. A point. On Wearside that counts as a parade.`,
      });
    }

    if (s.position >= 18) {
      out.push({
        kind: "misery-report",
        text: pick(
          [
            `WEARSIDE EMERGENCY: ${ord(s.position)} in the table. The Championship is getting closer.`,
            `Sunderland sit ${ord(s.position)} on ${s.points} points. Somebody tell them the bottom three isn't a trophy.`,
          ],
          seed + "rz",
        ),
      });
    }

    if (s.pRelegation !== undefined) {
      const pct = Math.round(s.pRelegation * 100);
      out.push({
        kind: "social",
        text:
          pct >= 50
            ? `Sunderland relegation probability: ${pct}%. HOWAYSTATS — the numbers don't lie.`
            : `Sunderland relegation probability: ${pct}%. Lower than we'd like. The season's long, mind.`,
      });
    }

    const gap = n.points - s.points;
    if (gap > 0) {
      out.push({
        kind: "headline",
        text: `${gap} points between the Toon and the Mackems. The Tyne and the Wear have never been further apart.`,
      });
    } else if (gap < 0) {
      out.push({
        kind: "headline",
        text: `Sunderland are ${-gap} points ahead of us. Aye, we know. It's in the table. We don't fiddle the numbers.`,
      });
    }
  }

  if (f.jarPercent !== undefined && s) {
    const j = Math.round(f.jarPercent);
    out.push({
      kind: "misery-report",
      text:
        j >= 100 ? "THE TEAR JAR HAS OVERFLOWN. Wearside Emergency Services have been informed."
        : j >= 75 ? `Tear Jar at ${j}%. It's going to need a bigger fridge.`
        : j >= 50 ? `Tear Jar ${j}% full. The Wearside reservoir is filling nicely.`
        : j >= 25 ? `Tear Jar at ${j}%. A steady drip from the Stadium of Light.`
        : `Tear Jar only ${j}% full. Tear reserves running low on Wearside. Give it time.`,
    });
  }
  if (f.miseryIndex !== undefined && s) {
    const m = f.miseryIndex;
    if (m >= 60) out.push({ kind: "headline", text: `Mackem Misery Index: ${m}. Another week, another Wearside wobble.` });
    else if (m < 20) out.push({ kind: "headline", text: `Misery Index down at ${m}. Let them enjoy it. It never lasts.` });
  }

  if (f.derbyNext) {
    out.push({ kind: "headline", text: "Derby next. The Tyne is ours — now go and prove it." });
  }

  if (out.length === 0) {
    out.push({ kind: "headline", text: `Newcastle ${ord(n.position)} on ${n.points} points. Howay the lads.` });
  }
  return out;
}
