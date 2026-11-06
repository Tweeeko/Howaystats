import type { Club, StandingRow } from "@/lib/types";
import type { Prediction } from "@/lib/database/queries";
import { pointsInLast } from "@/lib/football/standings";
import { ordinal } from "@/lib/view";
import { Crest, Form } from "./football";

type Side = { club?: Club; row: StandingRow; pred?: Prediction };

/**
 * TWO CLUBS. VERY DIFFERENT WEEKENDS. — the big picture. Two columns even on a phone:
 * each column stacks vertically, so long names never fight the numbers for space.
 */
export function BigPicture({ n, s }: { n: Side; s: Side }) {
  const col = (x: Side, mackem: boolean) => {
    const p = x.pred;
    const keyStat = mackem
      ? { label: "Relegation chance", v: p ? `${Math.round(p.pRelegation * 100)}%` : "—" }
      : { label: "Europe chance", v: p ? `${Math.round(p.pTop7 * 100)}%` : "—" };
    return (
      <div className={`flex min-w-0 flex-col ${mackem ? "rival-red" : "rival-bw"}`}>
        <div className="flex items-center gap-2 border-b border-[var(--line-strong)] px-3 py-2.5 sm:px-4">
          <Crest club={x.club} size={26} />
          <span className={`display min-w-0 truncate text-lg sm:text-2xl ${mackem ? "text-mackem" : ""}`}>{x.club?.shortName}</span>
        </div>
        <div className="px-3 pb-4 pt-3 sm:px-4">
          <div className="flex items-baseline gap-2">
            <span className="scoreboard-num text-5xl leading-none sm:text-6xl">{ordinal(x.row.position)}</span>
          </div>
          <div className="mt-1 text-mist">
            <span className="scoreboard-num text-xl text-chalk">{x.row.points}</span> pts ·{" "}
            <span className="scoreboard-num">{x.row.goalDifference > 0 ? `+${x.row.goalDifference}` : x.row.goalDifference}</span> GD
          </div>
          <div className="mt-3"><Form form={x.row.form} /></div>
          <div className="mt-4 border-t border-[var(--line)] pt-2">
            <div className="text-xs text-silver">{keyStat.label}</div>
            <div className={`scoreboard-num text-3xl ${mackem ? "text-mackem" : "text-chalk"}`}>{keyStat.v}</div>
          </div>
        </div>
      </div>
    );
  };
  const gap = n.row.points - s.row.points;
  return (
    <div className="overflow-hidden border border-[var(--line-strong)] bg-black/50 backdrop-blur-sm">
      <div className="grid grid-cols-2 divide-x divide-[var(--line-strong)]">
        {col(n, false)}
        {col(s, true)}
      </div>
      <p className="border-t border-[var(--line-strong)] bg-black/60 px-4 py-2.5 text-[0.95rem] text-mist">
        {gap > 0 ? (
          <><b className="text-chalk">{gap} points</b> and <b className="text-chalk">{s.row.position - n.row.position} places</b> between us. Not that we&apos;re counting. We are.</>
        ) : gap < 0 ? (
          <>Sunderland are {-gap} point{gap === -1 ? "" : "s"} ahead. Aye, we know. It&apos;s the table — we don&apos;t fiddle it.</>
        ) : (
          <>Level on points. Goal difference is doing the talking.</>
        )}
      </p>
    </div>
  );
}

/** WHO OWNS THE NORTH EAST? — central split score plus mirrored bars. */
export function RivalryBoard({
  n,
  s,
  scoreA,
  h2h,
}: {
  n: Side;
  s: Side;
  scoreA: number;
  h2h: { aWins: number; draws: number; bWins: number; played: number };
}) {
  type Row = { label: string; a: number; b: number; show: (v: number) => string; lowerBetter?: boolean };
  const rows: Row[] = [
    { label: "Position", a: n.row.position, b: s.row.position, show: ordinal, lowerBetter: true },
    { label: "Points", a: n.row.points, b: s.row.points, show: String },
    { label: "Goal difference", a: n.row.goalDifference, b: s.row.goalDifference, show: (v) => (v > 0 ? `+${v}` : `${v}`) },
    { label: "Points, last 5", a: pointsInLast(n.row), b: pointsInLast(s.row), show: String },
  ];
  if (n.pred && s.pred) {
    rows.push(
      { label: "Projected finish", a: n.pred.projectedPosition, b: s.pred.projectedPosition, show: ordinal, lowerBetter: true },
      { label: "Relegation chance", a: n.pred.pRelegation, b: s.pred.pRelegation, show: (v) => `${Math.round(v * 100)}%`, lowerBetter: true },
    );
  }
  return (
    <div>
      {/* the split */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crest club={n.club} size={40} />
          <span className="scoreboard-num text-6xl leading-none sm:text-7xl">{scoreA}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="scoreboard-num text-6xl leading-none text-mackem sm:text-7xl">{100 - scoreA}</span>
          <Crest club={s.club} size={40} />
        </div>
      </div>
      <div className="mt-3 flex h-4 overflow-hidden">
        <div className="bar-grow h-full" style={{ width: `${scoreA}%`, background: "var(--stripe)" }} />
        <div className="h-full flex-1" style={{ background: "var(--mackem-stripe)" }} />
      </div>
      <p className="mt-2 text-xs text-silver">Score out of 100, from points per game, goal difference, last five, position and projected finish.</p>

      {/* mirrored bars */}
      <div className="mt-6 grid gap-3">
        {rows.map((r) => {
          const aBetter = r.lowerBetter ? r.a < r.b : r.a > r.b;
          const bBetter = r.lowerBetter ? r.b < r.a : r.b > r.a;
          const total = Math.abs(r.a) + Math.abs(r.b) || 1;
          let aw = Math.abs(r.a) / total;
          if (r.lowerBetter) aw = 1 - aw;
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className={`scoreboard-num text-lg ${aBetter ? "text-chalk" : "text-silver"}`}>{r.show(r.a)}</span>
                <span className="text-silver">{r.label}</span>
                <span className={`scoreboard-num text-lg ${bBetter ? "text-mackem" : "text-silver"}`}>{r.show(r.b)}</span>
              </div>
              <div className="flex h-1.5 gap-[2px]">
                <div className="flex flex-1 justify-end bg-slate"><div className="bar-grow h-full bg-chalk" style={{ width: `${Math.max(3, aw * 100)}%`, transformOrigin: "right", opacity: aBetter ? 1 : 0.5 }} /></div>
                <div className="flex-1 bg-slate"><div className="bar-grow h-full bg-mackem" style={{ width: `${Math.max(3, (1 - aw) * 100)}%`, opacity: bBetter ? 1 : 0.5 }} /></div>
              </div>
            </div>
          );
        })}
        <div className="mt-1 flex items-center justify-between border-t border-[var(--line)] pt-3 text-sm">
          <span className="scoreboard-num text-lg">{h2h.played ? h2h.aWins : ""}</span>
          <span className="text-silver">
            Head to head{h2h.played ? ` · ${h2h.draws} draw${h2h.draws === 1 ? "" : "s"} in ${h2h.played}` : " · no league meetings stored yet"}
          </span>
          <span className="scoreboard-num text-lg text-mackem">{h2h.played ? h2h.bWins : ""}</span>
        </div>
      </div>
    </div>
  );
}
