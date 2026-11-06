import type { Club, StandingRow } from "@/lib/types";
import { ordinal } from "@/lib/view";
import { Crest } from "./football";

/** The Tyne–Wear gap, readable at a glance: two rows, then the difference in plain words. */
export function TyneGap({ n, s, nClub, sClub }: { n: StandingRow; s: StandingRow; nClub?: Club; sClub?: Club }) {
  const pts = n.points - s.points;
  const places = s.position - n.position;
  const row = (r: StandingRow, c: Club | undefined, mackem: boolean) => (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3">
      <Crest club={c} size={32} />
      <span className={`display truncate text-2xl sm:text-3xl ${mackem ? "text-mackem" : ""}`}>{c?.shortName ?? ""}</span>
      <span className="scoreboard-num w-14 text-right text-xl text-silver">{ordinal(r.position)}</span>
      <span className="scoreboard-num w-20 text-right text-2xl">
        {r.points}
        <span className="ml-1 font-sans text-sm text-silver">pts</span>
      </span>
    </div>
  );
  return (
    <div className="panel">
      <div className="divide-y divide-[var(--line)] px-4">
        {row(n, nClub, false)}
        {row(s, sClub, true)}
      </div>
      <p className="border-t border-[var(--line-strong)] bg-black/50 px-4 py-3 text-base">
        {pts > 0 ? (
          <>Newcastle are <b className="text-chalk">{pts} point{pts === 1 ? "" : "s"}</b> and <b className="text-chalk">{places} place{places === 1 ? "" : "s"}</b> ahead.</>
        ) : pts < 0 ? (
          <>Sunderland are {-pts} point{pts === -1 ? "" : "s"} ahead. It&apos;s in the table, so it&apos;s in here. We don&apos;t fiddle the numbers.</>
        ) : (
          <>Level on points. {places > 0 ? "Newcastle ahead on goal difference." : "Sunderland ahead on goal difference. Grim."}</>
        )}
      </p>
    </div>
  );
}
