import type { Metadata } from "next";
import { getSnapshot } from "@/lib/database/queries";
import { freshness, pct } from "@/lib/view";
import { LeagueTable, TableTabs } from "@/components/league-table";
import { Crest, FixtureTicket, Freshness, NotConnected } from "@/components/football";
import { PitchDivider, SectionHead } from "@/components/stadium";

export const revalidate = 60;
export const metadata: Metadata = { title: "Premier League table", description: "Live Premier League table with home and away splits, form and 50,000-season projections." };

export default async function PremierLeague({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: v } = await searchParams;
  const view = v === "home" || v === "away" ? v : "overall";
  const s = await getSnapshot();
  const fresh = freshness(s);
  const projected = new Map([...s.predictions.values()].map((p) => [p.clubId, p.projectedPosition]));
  const results = s.fixtures.filter((f) => f.status === "finished").slice(-12).reverse();
  const upcoming = s.fixtures.filter((f) => f.status !== "finished" && f.status !== "cancelled").slice(0, 12);
  const postponed = s.fixtures.filter((f) => f.status === "postponed");
  const preds = [...s.predictions.values()].sort((a, b) => a.expectedPosition - b.expectedPosition);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="display-i text-6xl sm:text-8xl">Premier League</h1>
      <div className="mt-2"><Freshness {...fresh} /></div>
      <PitchDivider />
      {!s.table.length ? (
        <NotConnected />
      ) : (
        <>
          <SectionHead title="League Table" sub={`${s.season}/${String(s.season + 1).slice(2)} · ${view}`} />
          <TableTabs view={view} />
          <div className="panel p-3 sm:p-5">
            <LeagueTable table={s.table} clubs={s.clubs} view={view} movement={view === "overall" ? projected : undefined} />
          </div>

          {preds.length > 0 && (
            <>
              <PitchDivider />
              <span id="projections" />
              <SectionHead title="The Projections" sub={`${s.run?.simulations.toLocaleString("en-GB")} simulated seasons`} />
              <div className="panel overflow-x-auto p-3 sm:p-5">
                <table className="pl-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="l">Club</th><th>Exp. pts</th><th>Title</th><th>Top 4</th><th>Top 6</th><th>Top 10</th><th>Relegated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preds.map((p) => (
                      <tr key={p.clubId}>
                        <td className="l"><span className="flex items-center gap-2"><Crest club={s.clubs.get(p.clubId)} size={18} /><span className="display text-lg">{s.clubs.get(p.clubId)?.shortName}</span></span></td>
                        <td className="pts">{p.expectedPoints.toFixed(1)}</td>
                        <td>{pct(p.pTitle, 1)}</td>
                        <td>{pct(p.pTop4, 1)}</td>
                        <td>{pct(p.pTop6, 1)}</td>
                        <td>{pct(p.pTop10, 1)}</td>
                        <td className={p.pRelegation > 0.3 ? "text-mackem" : ""}>{pct(p.pRelegation, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <PitchDivider />
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <SectionHead title="Results" sub="Latest" />
              <div className="grid gap-3 sm:grid-cols-2">{results.map((f) => <FixtureTicket key={f.id} f={f} clubs={s.clubs} />)}</div>
            </div>
            <div>
              <SectionHead title="Fixtures" sub="Next up" />
              <div className="grid gap-3 sm:grid-cols-2">{upcoming.map((f) => <FixtureTicket key={f.id} f={f} clubs={s.clubs} />)}</div>
              {postponed.length > 0 && (
                <p className="mt-4 font-mono text-xs uppercase text-silver">{postponed.length} postponed fixture{postponed.length > 1 ? "s" : ""} awaiting a new date — excluded from the table until played.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
