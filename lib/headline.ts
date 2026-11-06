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
      ? { main: "The Tyne is ours.", sub: `Newcastle ${s.ga}, Sunderland ${s.gf}${s.comp}. Frame it.` }
      : s.r === "D"
        ? { main: "Derby ends level.", sub: `${s.gf}-${s.ga}. They'll be acting like they won it. They didn't.` }
        : { main: "We're not talking about it.", sub: `They won the derby ${s.gf}-${s.ga}${s.comp}. It's in the table, so it's on here. Moving on.` };
  }

  if (sameWeek && n!.r === "W" && s!.r === "L") {
    return pick([
      { main: "Toon win. Mackems lose.", sub: `Newcastle beat ${n!.opp} ${n!.gf}-${n!.ga}${n!.comp}. Sunderland lost ${s!.gf}-${s!.ga} to ${s!.opp}${s!.comp}. Canny week, that.` },
      { main: "Perfect week on the Tyne.", sub: `We beat ${n!.opp}${n!.comp}. They lost to ${s!.opp}${s!.comp}. Wey aye.` },
    ], seed, "both");
  }

  if (s?.r === "L") {
    const heavy = s.ga - s.gf >= 3;
    if (heavy) return { main: "Someone check on Sunderland.", sub: `Battered ${s.ga}-${s.gf} by ${s.opp}${s.comp}. Actually, divvent bother checking.` };
    if (inZone) return pick([
      { main: "Sunderland lose again.", sub: `${s.gf}-${s.ga} to ${s.opp}${s.comp}. Still ${pos}${winless >= 3 ? `, ${winless} games without a win` : ""}. Absolute shambles.` },
      { main: "Wearside's gone quiet.", sub: `Beaten ${s.ga}-${s.gf} by ${s.opp}${s.comp}. ${pos} in the league. Gan on, have a look at the table.` },
    ], seed, "l1");
    return pick([
      { main: `Sunderland beaten by ${s.opp}.`, sub: `${s.gf}-${s.ga}${s.comp}. Another excuse doing the rounds on the Wear by tonight.` },
      { main: "Get in.", sub: `Sunderland lost ${s.gf}-${s.ga} to ${s.opp}${s.comp}. That's it. That's the headline.` },
    ], seed, "l2");
  }

  if (s?.r === "D") {
    return pick([
      { main: "Sunderland couldn't get it done.", sub: `${s.gf}-${s.ga} with ${s.opp}${s.comp}. Wearside celebrations reached dangerous levels anyway.` },
      { main: "A draw. On the Wear that's a parade.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. Still ${pos}.` },
    ], seed, "d");
  }

  if (s?.r === "W") {
    if (s.margin === 1) return pick([
      { main: "Mackems scrape one.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. They're acting like they've won the Champions League. Calm down.` },
      { main: "Three points? Calm down.", sub: `Edged ${s.opp} ${s.gf}-${s.ga}${s.comp}. Still ${pos} in the league, mind.` },
    ], seed, "w1");
    return pick([
      { main: "Sunderland won. We checked.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. Still ${pos}. They'll be unbearable till Tuesday.` },
      { main: "Mackems get carried away.", sub: `Beat ${s.opp} ${s.gf}-${s.ga}${s.comp}. Somebody tell them it's ${pos} in the league.` },
    ], seed, "w2");
  }

  if (n?.r === "W") return { main: `Toon beat ${n.opp}.`, sub: `${n.gf}-${n.ga}${n.comp}. ${ord(nufc.position)} in the league. Howay the lads.` };
  return { main: `Newcastle ${ord(nufc.position)}. Sunderland ${pos}.`, sub: "Carry on." };
}
