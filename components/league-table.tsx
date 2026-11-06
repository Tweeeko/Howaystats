import Link from "next/link";
import type { Club, Split, StandingRow } from "@/lib/types";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { Crest, Form } from "./football";

type View = "overall" | "home" | "away";

function pick(r: StandingRow, view: View): Split & { gd: number } {
  const s = view === "home" ? r.home : view === "away" ? r.away : r;
  return { ...s, gd: s.goalsFor - s.goalsAgainst };
}

export function LeagueTable({
  table,
  clubs,
  compact = false,
  view = "overall",
  movement,
  condensed = false,
  showMovement = false,
}: {
  table: StandingRow[];
  clubs: Map<number, Club>;
  compact?: boolean;
  view?: View;
  movement?: Map<number, number>; // projected position (from the model), shown as a hint
  condensed?: boolean; // top six, Newcastle, Sunderland and the bottom five only
  showMovement?: boolean; // treat `movement` as places moved since the last matchday
}) {
  const proj = showMovement ? undefined : movement;
  const n = table.length;
  const rows =
    view === "overall"
      ? table
      : [...table].sort((a, b) => {
          const x = pick(a, view), y = pick(b, view);
          return y.points - x.points || y.gd - x.gd || y.goalsFor - x.goalsFor;
        });

  return (
    <div className="overflow-x-auto">
      <table className="pl-table">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th className="l">Club</th>
            <th>P</th>
            {!compact && (
              <>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th className="hidden sm:table-cell">GF</th>
                <th className="hidden sm:table-cell">GA</th>
              </>
            )}
            <th>GD</th>
            <th>Pts</th>
            {view === "overall" && <th className={compact ? "hidden sm:table-cell" : "hidden md:table-cell"}>Form</th>}
            {proj && !compact && <th className="hidden md:table-cell" title="Most likely finishing position from 50,000 simulations">Proj.</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            if (condensed && view === "overall") {
              const keep = (x: StandingRow) => x.position <= 6 || x.position > n - 5 || x.clubId === NEWCASTLE_ID || x.clubId === SUNDERLAND_ID;
              if (!keep(r)) {
                const prev = rows[i - 1];
                return prev && keep(prev) ? (
                  <tr key={`gap-${r.clubId}`} aria-hidden>
                    <td colSpan={12} className="!py-1 text-center text-silver">···</td>
                  </tr>
                ) : null;
              }
            }
            const s = pick(r, view);
            const pos = view === "overall" ? r.position : i + 1;
            const zone = pos <= 4 ? "zone-cl" : pos <= 7 ? "zone-eu" : pos > n - 3 ? "zone-rel" : "";
            const c = clubs.get(r.clubId);
            const me = r.clubId === NEWCASTLE_ID ? "is-nufc" : r.clubId === SUNDERLAND_ID ? "is-safc" : "";
            return (
              <tr key={r.clubId} className={`${zone} ${me} ${pos === n - 3 ? "cutline" : ""}`}>
                <td className="whitespace-nowrap font-mono text-silver">
                  {pos}
                  {showMovement && view === "overall" && movement?.get(r.clubId) ? (
                    <span className={`ml-0.5 text-[10px] ${movement.get(r.clubId)! > 0 ? "text-pitch" : "text-mackem"}`} aria-label={`${movement.get(r.clubId)! > 0 ? "up" : "down"} ${Math.abs(movement.get(r.clubId)!)}`}>
                      {movement.get(r.clubId)! > 0 ? "▲" : "▼"}
                    </span>
                  ) : null}
                  {r.unresolvedTie && view === "overall" && <span title="Level on every tie-breaker — play-off would decide">*</span>}
                </td>
                <td className="l w-full max-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <Crest club={c} size={20} />
                    <span className={`display min-w-0 truncate text-[1.08rem] ${me ? "text-chalk" : ""}`}>{c?.shortName ?? r.clubId}</span>
                  </span>
                </td>
                <td>{s.played}</td>
                {!compact && (
                  <>
                    <td>{s.won}</td>
                    <td>{s.drawn}</td>
                    <td>{s.lost}</td>
                    <td className="hidden sm:table-cell">{s.goalsFor}</td>
                    <td className="hidden sm:table-cell">{s.goalsAgainst}</td>
                  </>
                )}
                <td>{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                <td className="pts">{s.points}</td>
                {view === "overall" && (
                  <td className={compact ? "hidden sm:table-cell" : "hidden md:table-cell"}>
                    <Form form={r.form} />
                  </td>
                )}
                {proj && !compact && <td className="hidden font-mono text-silver md:table-cell">{proj.get(r.clubId) ?? "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!compact && <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-silver">
        <span><span className="mr-1 inline-block h-2 w-2 bg-chalk" />Top four</span>
        <span><span className="mr-1 inline-block h-2 w-2 bg-pitch" />Usually Europe</span>
        <span><span className="mr-1 inline-block h-2 w-2 bg-mackem" />Relegation</span>
      </p>}
    </div>
  );
}

export function TableTabs({ view }: { view: View }) {
  const tabs: View[] = ["overall", "home", "away"];
  return (
    <div className="mb-3 inline-flex border border-[var(--line-strong)]">
      {tabs.map((t) => (
        <Link
          key={t}
          href={t === "overall" ? "/premier-league" : `/premier-league?view=${t}`}
          className={`display px-4 py-1.5 text-base ${view === t ? "bg-chalk text-ink" : "text-silver hover:text-chalk"}`}
          scroll={false}
        >
          {t}
        </Link>
      ))}
    </div>
  );
}
