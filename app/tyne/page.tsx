import type { Metadata } from "next";
import { getSnapshot } from "@/lib/database/queries";
import { adminDbOptional } from "@/lib/database/optional";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { tyneView } from "@/lib/view";
import { NorthEastMeter, PositionChart, TyneRows } from "@/components/tyne";
import { NotConnected } from "@/components/football";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { ShareBar } from "@/components/share";

export const revalidate = 300;
export const metadata: Metadata = { title: "The Tyne Comparison — Newcastle v Sunderland", description: "Newcastle and Sunderland side by side: points, form, goal difference, projections and who owns the North East." };

export default async function Tyne() {
  const s = await getSnapshot();
  const t = tyneView(s);
  const history = await seasonHistory();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="display-i text-6xl sm:text-8xl">The Tyne Comparison</h1>
      <p className="mt-2 text-mist">Two clubs, twelve miles, one league table. Updated automatically after every result.</p>
      <PitchDivider />
      {!t ? (
        s.table.length ? <p className="display text-3xl">Both clubs need to be in this season&apos;s table for a comparison.</p> : <NotConnected />
      ) : (
        <>
          <div className="panel panel-top p-5 sm:p-8">
            <NorthEastMeter a={{ club: s.clubs.get(NEWCASTLE_ID), row: t.n, pred: t.pn }} b={{ club: s.clubs.get(SUNDERLAND_ID), row: t.u, pred: t.pu }} scoreA={t.score.scoreA} />
            <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {t.score.components.map((c) => (
                <li key={c.key} className="border-l-2 border-[var(--line-strong)] pl-3">
                  <div className="kicker !text-[0.6rem]">{c.key} · {Math.round(c.weight * 100)}%</div>
                  <div className="scoreboard-num text-lg">{Math.round(c.s * 100)}<span className="text-silver">–</span><span className="text-mackem">{100 - Math.round(c.s * 100)}</span></div>
                </li>
              ))}
            </ul>
            <div className="mt-5"><ShareBar path="/tyne" text={`Who owns the North East? Newcastle ${t.score.scoreA} – ${t.score.scoreB} Sunderland.`} graphic="/api/og?type=tyne" /></div>
          </div>
          <PitchDivider />
          <SectionHead title="Head to Head" sub="This season" />
          <div className="panel p-5"><TyneRows a={{ club: s.clubs.get(NEWCASTLE_ID), row: t.n, pred: t.pn }} b={{ club: s.clubs.get(SUNDERLAND_ID), row: t.u, pred: t.pu }} totalGames={2 * (s.table.length - 1)} /></div>
          {t.pn && t.pu && (
            <>
              <PitchDivider />
              <div className="grid gap-6 md:grid-cols-2">
                <div className="panel p-5"><div className="kicker mb-3">Newcastle finishing positions</div><PositionChart probs={t.pn.positionProbs} /></div>
                <div className="panel p-5"><div className="kicker mb-3 !text-mackem">Sunderland finishing positions</div><PositionChart probs={t.pu.positionProbs} mackem /></div>
              </div>
            </>
          )}
        </>
      )}
      {history.length > 0 && (
        <>
          <PitchDivider />
          <SectionHead title="Seasons Past" sub="From stored final tables" />
          <div className="panel overflow-x-auto p-3">
            <table className="pl-table">
              <thead><tr><th className="l">Season</th><th>NEW pos</th><th>NEW pts</th><th>SUN pos</th><th>SUN pts</th></tr></thead>
              <tbody>{history.map((h) => (<tr key={h.season}><td className="l">{h.season}/{String(h.season + 1).slice(2)}</td><td>{h.newPos ?? "—"}</td><td>{h.newPts ?? "—"}</td><td className="text-mackem">{h.sunPos ?? "not in PL"}</td><td>{h.sunPts ?? "—"}</td></tr>))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Historical comparison from previous seasons' stored standings (available once those seasons have been synced). */
async function seasonHistory() {
  const db = adminDbOptional();
  if (!db) return [];
  const { data } = await db.from("standings").select("season, club_id, position, points").in("club_id", [NEWCASTLE_ID, SUNDERLAND_ID]).order("season", { ascending: false });
  type Row = { season: number; newPos?: number; newPts?: number; sunPos?: number; sunPts?: number };
  const bySeason = new Map<number, Row>();
  for (const r of (data ?? []) as { season: number; club_id: number; position: number; points: number }[]) {
    const e: Row = bySeason.get(r.season) ?? { season: r.season };
    if (r.club_id === NEWCASTLE_ID) { e.newPos = r.position; e.newPts = r.points; } else { e.sunPos = r.position; e.sunPts = r.points; }
    bySeason.set(r.season, e);
  }
  return [...bySeason.values()].slice(1); // exclude the current season
}
