import type { Fixture, StandingRow } from "./types";
import { countsTowardsTable } from "./football/standings";
import { ord, pick } from "./voice";

/**
 * The front-page headline. Built only from the latest real results and positions, written the way
 * you'd say it in the pub. Sunderland never get a straight congratulation — win, lose or draw.
 */
export function backPageHeadline(opts: {
  fixtures: Fixture[];
  nufc?: StandingRow;
  safc?: StandingRow;
  nufcId: number;
  safcId: number;
  name: (id: number) => string;
  leagueSize: number;
  seed?: string;
}): { main: string; sub: string } | null {
  const { fixtures, nufc, safc, nufcId, safcId, name, leagueSize } = opts;
  if (!nufc || !safc) return null;
  const seed = opts.seed ?? new Date().toISOString().slice(0, 10);
  const last = (id: number) =>
    fixtures
      .filter(countsTowardsTable)
      .filter((f) => f.homeId === id || f.awayId === id)
      .sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0];
  const res = (f: Fixture | undefined, id: number) => {
    if (!f) return null;
    const home = f.homeId === id;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    const comp = (f.leagueId ?? 39) === 39 ? "" : ` in the ${f.competition ?? "cup"}`;
    return { r: gf > ga ? "W" : gf === ga ? "D" : "L", gf, ga, opp: name(home ? f.awayId : f.homeId), oppId: home ? f.awayId : f.homeId, at: f.kickoff, comp, margin: gf - ga };
  };
  const n = res(last(nufcId), nufcId);
  const s = res(last(safcId), safcId);
  const inZone = safc.position > leagueSize - 3;
  const sameWeek = n && s && Math.abs(Date.parse(n.at) - Date.parse(s.at)) < 4 * 86_400_000;
  const winless = (() => {
    let k = 0;
    for (const r of [...safc.form].reverse()) {
      if (r === "W") break;
      k++;
    }
    return k;
  })();
  const pos = ord(safc.position);

  // Derby
  if (s && s.oppId === nufcId) {
    return s.r === "L"
      ? { main: "Who put the ball in the Mackems' net?", sub: `Newcastle ${s.ga}, Sunderland ${s.gf}${s.comp}. Sad Mackem bastards. Frame it, print it, read it to the bairns.` }
      : s.r === "D"
        ? { main: "Derby ends level.", sub: `${s.gf}-${s.ga}. They'll be acting like they won it. They didn't.` }
        : { main: "We're not talking about it.", sub: `They won the derby ${s.gf}-${s.ga}${s.comp}. It's in the results so it's on here. That's all you're getting.` };
  }

  const nLost = n?.r === "L";
  if (sameWeek && n!.r === "W" && s!.r === "L") {
    return pick([
      { main: "Toon win. Mackems lose.", sub: `We beat ${n!.opp} ${n!.gf}-${n!.ga}${n!.comp}. They lost ${s!.gf}-${s!.ga} to ${s!.opp}${s!.comp}. Lovely weekend, that.` },
      { main: "Well, that's a lovely weekend.", sub: `Newcastle beat ${n!.opp}${n!.comp}. Sunderland lost to ${s!.opp}${s!.comp}. Pint, anyone?` },
    ], seed, "both");
  }
  if (sameWeek && nLost && s!.r === "L") {
    return { main: "Both lost. Theirs was funnier.", sub: `We got beat by ${n!.opp}${n!.comp}, but fuck it, still better than them Mackems. They lost ${s!.gf}-${s!.ga} to ${s!.opp}${s!.comp}.` };
  }
  if (sameWeek && nLost && s!.r === "W") {
    return { main: "One-off. Calm down.", sub: `They beat ${s!.opp} ${s!.gf}-${s!.ga}. We got beat by ${n!.opp}${n!.comp}, but fuck it, we're still the bigger club and they know it.` };
  }

  if (s?.r === "L") {
    const heavy = s.ga - s.gf >= 3;
    if (heavy) return pick([
      { main: "Someone check on Sunderland.", sub: `Battered ${s.ga}-${s.gf} by ${s.opp}${s.comp}. Actually, divvent bother. SMBs.` },
      { main: "Have a look at the state of that.", sub: `${s.opp} ${s.ga}, Sunderland ${s.gf}${s.comp}. Never mind the table.` },
    ], seed, "heavy");
    if (inZone) return pick([
      { main: "Sunderland lose again.", sub: `${s.gf}-${s.ga} to ${s.opp}${s.comp}. Still ${pos}${winless >= 3 ? `, ${winless} without a win` : ""}. Absolute shambles.` },
      { main: "Another day on Wearside.", sub: `Beaten ${s.ga}-${s.gf} by ${s.opp}${s.comp}. ${pos} in the league. Kettle's on.` },
    ], seed, "l1");
    return pick([
      { main: `Sunderland beaten by ${s.opp}.`, sub: `${s.gf}-${s.ga}${s.comp}. The excuses will be doing the rounds on the Wear by teatime.` },
      { main: "Get in.", sub: `Sunderland lost ${s.gf}-${s.ga} to ${s.opp}${s.comp}. That's it. That's the headline.` },
    ], seed, "l2");
  }

  if (s?.r === "D") {
    return pick([
      { main: "Sunderland couldn't get it done.", sub: `${s.gf}-${s.ga} with ${s.opp}${s.comp}. Still ${pos}.` },
      { main: "A draw. On the Wear that's a parade.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. Get the bunting out, lads.` },
    ], seed, "d");
  }

  if (s?.r === "W") {
    const where = inZone ? ` Still ${pos}, mind.` : "";
    if (s.margin === 1) return pick([
      { main: "Mackems scrape one.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. You'd think they'd won the fucking World Cup.${where}` },
      { main: "Three points? Calm down.", sub: `Edged ${s.opp} ${s.gf}-${s.ga}${s.comp}. Somebody turn the music down on the Wear.${where}` },
    ], seed, "w1");
    return pick([
      { main: "Sunderland won. We checked twice.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. They'll be unbearable till Tuesday.${where}` },
      { main: "Mackems get carried away.", sub: `Beat ${s.opp} ${s.gf}-${s.ga}${s.comp}. Open-top bus booked for Monday, probably.${where}` },
    ], seed, "w2");
  }

  if (n?.r === "W") return { main: `Toon beat ${n.opp}.`, sub: `${n.gf}-${n.ga}${n.comp}. ${ord(nufc.position)} in the league. Howay the lads.` };
  if (nLost) return { main: "We go again.", sub: `Got beat by ${n!.opp}${n!.comp}, but fuck it.${nufc.position < safc.position ? " Still better than them Mackems." : ""}` };
  return { main: `Newcastle ${ord(nufc.position)}. Sunderland ${pos}.`, sub: "As you were." };
}
