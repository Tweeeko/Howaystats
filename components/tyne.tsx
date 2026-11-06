import type { Club, StandingRow } from "@/lib/types";
import type { Prediction } from "@/lib/database/queries";
import { pointsInLast } from "@/lib/football/standings";
import { ordinal, pct } from "@/lib/view";
import { Crest, Form } from "./football";

type Side = { club?: Club; row: StandingRow; pred?: Prediction };

/** WHO OWNS THE NORTH EAST? — tug-of-war bar from the documented composite score. */
export function NorthEastMeter({ a, b, scoreA }: { a: Side; b: Side; scoreA: number }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <Crest club={a.club} size={30} />
          <span className="scoreboard-num text-4xl">{scoreA}</span>
        </div>
        <span className="display-i text-center text-xl sm:text-2xl">Who owns the North East?</span>
        <div className="flex items-center gap-2">
          <span className="scoreboard-num text-4xl text-mackem">{100 - scoreA}</span>
          <Crest club={b.club} size={30} />
        </div>
      </div>
      <div className="relative flex h-7 overflow-hidden border border-[var(--line-strong)]">
        <div className="bar-grow h-full" style={{ width: `${scoreA}%`, background: "var(--stripe)" }} />
        <div className="h-full flex-1" style={{ background: "var(--mackem-stripe)", opacity: 0.85 }} />
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-ink" />
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-silver">
        35% points per game · 20% goal difference · 20% last five · 15% position · 10% projected finish
      </p>
    </div>
  );
}

/** Side-by-side rows, broadcast "head-to-head" graphic style. Higher-is-better rows highlight the leader. */
export function TyneRows({ a, b, totalGames }: { a: Side; b: Side; totalGames: number }) {
  const rows: { label: string; a: number; b: number; fmt?: (v: number) => string; lowerBetter?: boolean }[] = [
    { label: "League position", a: a.row.position, b: b.row.position, fmt: ordinal, lowerBetter: true },
    { label: "Points", a: a.row.points, b: b.row.points },
    { label: "Played", a: a.row.played, b: b.row.played },
    { label: "Wins", a: a.row.won, b: b.row.won },
    { label: "Goals scored", a: a.row.goalsFor, b: b.row.goalsFor },
    { label: "Goal difference", a: a.row.goalDifference, b: b.row.goalDifference, fmt: (v) => (v > 0 ? `+${v}` : `${v}`) },
    { label: "Points, last five", a: pointsInLast(a.row), b: pointsInLast(b.row) },
    { label: "Games remaining", a: totalGames - a.row.played, b: totalGames - b.row.played },
  ];
  if (a.pred && b.pred) {
    rows.push(
      { label: "Relegation chance", a: a.pred.pRelegation, b: b.pred.pRelegation, fmt: (v) => pct(v, 1), lowerBetter: true },
      { label: "Top-six chance", a: a.pred.pTop6, b: b.pred.pTop6, fmt: (v) => pct(v, 1) },
      { label: "Projected finish", a: a.pred.projectedPosition, b: b.pred.projectedPosition, fmt: ordinal, lowerBetter: true },
    );
  }
  return (
    <div className="divide-y divide-[var(--line)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-3">
        <div className="flex items-center gap-2"><Crest club={a.club} size={26} /><span className="display text-2xl">{a.club?.shortName}</span></div>
        <span className="kicker">vs</span>
        <div className="flex items-center justify-end gap-2"><span className="display text-2xl text-mackem">{b.club?.shortName}</span><Crest club={b.club} size={26} /></div>
      </div>
      {rows.map((r) => {
        const fmt = r.fmt ?? ((v: number) => String(v));
        const max = Math.max(Math.abs(r.a), Math.abs(r.b), 1e-9);
        const aWins = r.lowerBetter ? r.a < r.b : r.a > r.b;
        const bWins = r.lowerBetter ? r.b < r.a : r.b > r.a;
        const share = (v: number) => (r.lowerBetter ? 0.25 + 0.75 * (1 - Math.abs(v) / (max * 1.15)) : Math.abs(v) / max);
        return (
          <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
            <div className="flex items-center justify-end gap-2">
              <span className={`scoreboard-num text-lg ${aWins ? "text-chalk" : "text-silver"}`}>{fmt(r.a)}</span>
              <div className="h-2 w-full max-w-[160px] bg-slate">
                <div className="bar-grow ml-auto h-full bg-chalk" style={{ width: `${Math.max(4, share(r.a) * 100)}%`, opacity: aWins ? 1 : 0.45, transformOrigin: "right" }} />
              </div>
            </div>
            <span className="kicker w-28 text-center !text-[0.62rem] sm:w-36">{r.label}</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-full max-w-[160px] bg-slate">
                <div className="bar-grow h-full bg-mackem" style={{ width: `${Math.max(4, share(r.b) * 100)}%`, opacity: bWins ? 1 : 0.45 }} />
              </div>
              <span className={`scoreboard-num text-lg ${bWins ? "text-mackem" : "text-silver"}`}>{fmt(r.b)}</span>
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-2 gap-3 pt-3">
        <Form form={a.row.form} />
        <div className="flex justify-end"><Form form={b.row.form} /></div>
      </div>
    </div>
  );
}

/** Position-probability histogram (from the 50,000 simulated seasons). */
export function PositionChart({ probs, mackem = false, highlight }: { probs: number[]; mackem?: boolean; highlight?: number }) {
  const max = Math.max(...probs, 0.01);
  const n = probs.length;
  return (
    <figure>
      <div className="flex h-36 items-end gap-[3px]" role="img" aria-label="Probability of each finishing position">
        {probs.map((p, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full origin-bottom"
              style={{
                height: `${(p / max) * 100}%`,
                minHeight: p > 0 ? 2 : 0,
                background: i >= n - 3 ? "#e0161f" : mackem ? "rgba(224,22,31,.45)" : i < 4 ? "#f4f4f0" : i < 7 ? "#2e8b4f" : "#5b636c",
                outline: highlight === i + 1 ? "2px solid #f4f4f0" : undefined,
                animation: `grow-y .9s ${i * 0.03}s cubic-bezier(.2,.8,.2,1) both`,
              }}
            />
            <span className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] group-hover:block">{(p * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] font-mono text-[9px] text-silver">
        {probs.map((_, i) => (
          <span key={i} className="flex-1 text-center">{i + 1}</span>
        ))}
      </div>
      <figcaption className="mt-1 font-mono text-[10px] uppercase tracking-wider text-silver">Finishing position · share of simulated seasons</figcaption>
    </figure>
  );
}
