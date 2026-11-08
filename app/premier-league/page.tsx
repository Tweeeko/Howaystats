import type { Metadata } from "next";
import { scheduleCatchUp } from "@/lib/catchup";
import { getSnapshot } from "@/lib/database/queries";
import { LeagueTable, TableTabs } from "@/components/league-table";
import { NotConnected } from "@/components/football";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { tableQuip } from "@/lib/voice";

export const revalidate = 60;
export const metadata: Metadata = { title: "The table", description: "The Premier League table, with Newcastle and Sunderland where you can see them." };

export default async function PremierLeague({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: v } = await searchParams;
  const view = v === "home" || v === "away" ? v : "overall";
  const s = await getSnapshot();
  scheduleCatchUp();
  const sunPos = s.table.find((r) => r.clubId === SUNDERLAND_ID)?.position;
  const nufcPos = s.table.find((r) => r.clubId === NEWCASTLE_ID)?.position;
  const quip = sunPos && nufcPos ? tableQuip(sunPos, nufcPos, s.table.length, `${s.season}-${sunPos}-${nufcPos}`) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="tabloid text-[clamp(3.4rem,11vw,7rem)]">The table</h1>
      {quip && <p className="serif mt-2 text-xl text-mist">{quip}</p>}
      <div className="mt-8">
        {!s.table.length ? (
          <NotConnected />
        ) : (
          <>
            <TableTabs view={view} />
            <div className="panel p-2 sm:p-4">
              <LeagueTable table={s.table} clubs={s.clubs} view={view} />
            </div>
            <p className="mt-3 text-xs text-silver">
              Premier League {s.season}/{String(s.season + 1).slice(2)}. Newcastle in white. Sunderland in red, near the bottom where they belong, or should be.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
