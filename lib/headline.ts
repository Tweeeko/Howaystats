import type { Fixture, StandingRow } from "./types";
import { countsTowardsTable } from "./football/standings";

/**
 * The homepage's back-page headline. Built only from the latest real results and positions,
 * written short and dry — the way you'd say it in the pub, not the way a press release would.
 */
export function backPageHeadline(opts: {
  fixtures: Fixture[];
  nufc?: StandingRow;
  safc?: StandingRow;
  nufcId: number;
  safcId: number;
  name: (id: number) => string;
  leagueSize: number;
}): { main: string; sub: string } | null {
  const { fixtures, nufc, safc, nufcId, safcId, name, leagueSize } = opts;
  if (!nufc || !safc) return null;
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
    return { r: gf > ga ? "W" : gf === ga ? "D" : "L", gf, ga, opp: name(home ? f.awayId : f.homeId), at: f.kickoff, comp };
  };
  const n = res(last(nufcId), nufcId);
  const s = res(last(safcId), safcId);
  const inZone = safc.position > leagueSize - 3;
  const sameWeekend = n && s && Math.abs(Date.parse(n.at) - Date.parse(s.at)) < 4 * 86_400_000;
  const winless = (() => {
    let k = 0;
    for (const r of [...safc.form].reverse()) {
      if (r === "W") break;
      k++;
    }
    return k;
  })();

  if (sameWeekend && n!.r === "W" && s!.r === "L") return { main: "Toon win. Mackems lose.", sub: `Newcastle beat ${n!.opp} ${n!.gf}-${n!.ga}${n!.comp}. Sunderland lost ${s!.gf}-${s!.ga} to ${s!.opp}${s!.comp}. Lovely week.` };
  if (s?.r === "L" && inZone) return { main: `Sunderland lose again.`, sub: `${s.gf}-${s.ga} to ${s.opp}${s.comp}. Still in the bottom three${winless >= 3 ? `, ${winless} league games without a win` : ""}.` };
  if (s?.r === "L") return { main: `Sunderland lose to ${s.opp}.`, sub: `${s.gf}-${s.ga}${s.comp}. ${ordinal(safc.position)} in the league.` };
  if (s?.r === "W" && inZone) return { main: "Sunderland won.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. Still ${ordinal(safc.position)} in the league though.` };
  if (s?.r === "W") return { main: "Sunderland won. We checked.", sub: `${s.gf}-${s.ga} against ${s.opp}${s.comp}. It happens.` };
  if (n?.r === "W") return { main: `Toon beat ${n.opp}.`, sub: `${n.gf}-${n.ga}${n.comp}. ${ordinal(nufc.position)} in the league.` };
  return { main: `Newcastle ${ordinal(nufc.position)}. Sunderland ${ordinal(safc.position)}.`, sub: "Carry on." };
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
