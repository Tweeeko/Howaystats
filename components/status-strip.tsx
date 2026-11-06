import type { Snapshot } from "@/lib/database/queries";
import { clubName } from "@/lib/view";
import { statusLabel } from "./football";

/** Broadcast-style ticker of live games, latest results and next fixtures — all from the stored feed. */
export function StatusStrip({ s }: { s: Snapshot }) {
  const live = s.fixtures.filter((f) => f.status === "live" || f.status === "halftime");
  const results = s.fixtures.filter((f) => f.status === "finished").slice(-10).reverse();
  const next = s.fixtures.filter((f) => f.status === "scheduled" && Date.parse(f.kickoff) > Date.now()).slice(0, 10);
  const items = [
    ...live.map((f) => ({ k: `l${f.id}`, live: true, t: `${clubName(s, f.homeId)} ${f.homeGoals}-${f.awayGoals} ${clubName(s, f.awayId)}`, st: statusLabel(f) })),
    ...results.map((f) => ({ k: `r${f.id}`, live: false, t: `${clubName(s, f.homeId)} ${f.homeGoals}-${f.awayGoals} ${clubName(s, f.awayId)}`, st: "FT" })),
    ...next.map((f) => ({ k: `n${f.id}`, live: false, t: `${clubName(s, f.homeId)} v ${clubName(s, f.awayId)}`, st: new Date(f.kickoff).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "Europe/London" }) + " " + statusLabel(f) })),
  ];
  return (
    <div className="flex items-stretch border-y border-[var(--line)] bg-black/70">
      <div className={`display-i flex shrink-0 items-center gap-2 px-3 text-base ${live.length ? "bg-mackem" : "bg-chalk text-ink"}`}>
        {live.length ? <><span className="h-2 w-2 animate-pulse rounded-full bg-chalk" /> Live</> : <>PL {s.season % 100}/{(s.season + 1) % 100}</>}
      </div>
      {items.length ? (
        <div className="ticker flex-1 py-2">
          <div className="ticker-track">
            {items.map((i) => (
              <span key={i.k} className="inline-flex items-center gap-2 font-mono text-[12px] uppercase">
                <span className={`px-1 text-[10px] ${i.live ? "bg-mackem" : "bg-slate"}`}>{i.st}</span>
                {i.t}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 px-3 py-2 font-mono text-[12px] uppercase text-silver">Fixture feed not connected yet</div>
      )}
    </div>
  );
}
