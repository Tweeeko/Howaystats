/* HOWAYSTATS fanzine furniture: each recurring feature has its own treatment. Server components. */
import Link from "next/link";
import type { Club, Fixture, StandingRow } from "@/lib/types";
import type { Meme, NewsArticle, Prediction } from "@/lib/database/queries";
import { pointsInLast } from "@/lib/football/standings";
import { ordinal } from "@/lib/view";
import { Crest, Form, ukDay } from "./football";
import { TearJar } from "./tear-jar";
import { ShareBar } from "./share";
import { EMPTY, formQuip, h2hQuip } from "@/lib/voice";

/* ─────────── Tape band: tilted ticker strip used as a divider ─────────── */
export function TapeBand({ lines, tone = "red", reverse = false }: { lines: string[]; tone?: "red" | "white" | "black"; reverse?: boolean }) {
  const cls = tone === "red" ? "bg-mackem text-chalk" : tone === "white" ? "bg-chalk text-ink" : "bg-ink text-chalk border-y border-chalk";
  const run = [...lines, ...lines];
  return (
    <div className={`tape-band ${reverse ? "rev" : ""} ${cls} relative z-10 shadow-[0_8px_20px_rgba(0,0,0,.5)]`} aria-hidden>
      <div className="run">
        {run.map((l, i) => (
          <span key={i} className="display-i inline-flex items-center gap-4 text-xl sm:text-2xl">
            {l}
            <span className="inline-block h-2 w-2 rotate-45 bg-current opacity-70" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sticker({ children, className = "", tone = "red" }: { children: React.ReactNode; className?: string; tone?: "red" | "white" | "black" }) {
  const t = tone === "red" ? "bg-mackem text-chalk" : tone === "white" ? "bg-chalk text-ink" : "bg-ink text-chalk";
  return <span className={`sticker ${t} ${className}`}>{children}</span>;
}

/* ─────────── 1. FRONT PAGE ─────────── */
export function FrontPage({
  dateline,
  headline,
  sub,
  jar,
  nufc,
  safc,
  nClub,
  sClub,
  updated,
}: {
  dateline: string;
  headline: string;
  sub: string;
  jar?: { percent: number };
  nufc?: StandingRow;
  safc?: StandingRow;
  nClub?: Club;
  sClub?: Club;
  updated: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto max-w-7xl overflow-x-clip px-4 pb-8 pt-3 sm:pt-6">
      {/* dateline like a paper */}
      <div className="flex items-center justify-between border-b-2 border-chalk pb-1 font-mono text-[10px] uppercase tracking-wider text-mist sm:text-xs">
        <span>{dateline}</span>
        <span className="hidden sm:inline">Printed on the Tyne · Not affiliated with anyone</span>
        <span className="text-mackem sm:hidden">Mackems pay double</span>
      </div>

      {/* the masthead */}
      <h1 className="masthead mt-2 select-none whitespace-nowrap text-[clamp(3.6rem,15.5vw,12rem)] text-chalk" aria-label="HOWAYSTATS">
        HOWAY<span className="text-outline">STATS</span>
      </h1>
      <div className="flex items-center gap-2">
        <span className="h-[6px] flex-1" style={{ background: "var(--stripe)" }} />
        <span className="display-i text-base text-chalk sm:text-2xl">The numbers don&apos;t lie.</span>
      </div>

      <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="tabloid text-[clamp(2.3rem,10.5vw,6.2rem)] drop-shadow-hard">{headline}</p>
          <p className="mt-2 max-w-xl text-base text-mist sm:text-lg">{sub}</p>
          <div className="mt-2">{updated}</div>
        </div>
        {jar && (
          <Link href="#tear-department" className="relative mx-auto block w-[170px] shrink-0 sm:w-[220px]" aria-label="Jump to the Tear Department">
            <TearJar percent={jar.percent} size={210} showCounts={false} />
            <Sticker className="round wobble absolute -left-3 top-6 h-20 w-20 text-[1.35rem]">
              {Math.round(jar.percent)}%
              <small className="block text-[.5rem] tracking-wider">tears index</small>
            </Sticker>
          </Link>
        )}
      </div>

      {nufc && safc && (
        <Link href="#tale-of-the-tape" className="mt-5 grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden border-2 border-chalk">
          <span className="stripes-bw relative flex items-center gap-2 px-3 py-2">
            <span className="absolute inset-0 bg-ink/70" />
            <span className="relative"><Crest club={nClub} size={26} /></span>
            <span className="relative scoreboard-num text-3xl text-chalk">{ordinal(nufc.position)}</span>
          </span>
          <span className="display grid place-items-center bg-chalk px-3 text-center text-sm leading-none text-ink">
            {Math.abs(safc.position - nufc.position)}
            <br />
            places
          </span>
          <span className="stripes-rw relative flex items-center justify-end gap-2 px-3 py-2">
            <span className="absolute inset-0 bg-blood/70" />
            <span className="relative scoreboard-num text-3xl text-chalk">{ordinal(safc.position)}</span>
            <span className="relative"><Crest club={sClub} size={26} /></span>
          </span>
        </Link>
      )}
    </div>
  );
}

/* ─────────── 2. TYNE V WEAR: TALE OF THE TAPE (fight poster) ─────────── */
type Side = { club?: Club; row: StandingRow; pred?: Prediction };

export function FightPoster({ n, s, h2h, scoreA, headline }: { n: Side; s: Side; h2h: { aWins: number; draws: number; bWins: number; played: number }; scoreA: number; headline: string }) {
  const rows: [string, string, string, -1 | 0 | 1][] = [];
  const cmp = (a: number, b: number, lower = false) => (a === b ? 0 : (lower ? a < b : a > b) ? -1 : 1) as -1 | 0 | 1;
  rows.push(["Position", ordinal(n.row.position), ordinal(s.row.position), cmp(n.row.position, s.row.position, true)]);
  rows.push(["Points", `${n.row.points}`, `${s.row.points}`, cmp(n.row.points, s.row.points)]);
  rows.push(["Goal difference", sign(n.row.goalDifference), sign(s.row.goalDifference), cmp(n.row.goalDifference, s.row.goalDifference)]);
  rows.push(["Goals scored", `${n.row.goalsFor}`, `${s.row.goalsFor}`, cmp(n.row.goalsFor, s.row.goalsFor)]);
  rows.push(["Points, last five", `${pointsInLast(n.row)}`, `${pointsInLast(s.row)}`, cmp(pointsInLast(n.row), pointsInLast(s.row))]);
  if (n.pred && s.pred) {
    rows.push(["Projected finish", ordinal(n.pred.projectedPosition), ordinal(s.pred.projectedPosition), cmp(n.pred.projectedPosition, s.pred.projectedPosition, true)]);
    rows.push(["Chance of going down", `${Math.round(n.pred.pRelegation * 100)}%`, `${Math.round(s.pred.pRelegation * 100)}%`, cmp(n.pred.pRelegation, s.pred.pRelegation, true)]);
  }
  if (h2h.played) rows.push(["Head to head (wins)", `${h2h.aWins}`, `${h2h.bWins}`, cmp(h2h.aWins, h2h.bWins)]);

  const corner = (x: Side, red: boolean) => (
    <div className={`relative flex flex-col items-center px-2 pb-4 pt-5 text-center ${red ? "stripes-rw" : "stripes-bw"}`}>
      <div className={`absolute inset-0 ${red ? "bg-gradient-to-b from-blood/30 to-blood/90" : "bg-gradient-to-b from-ink/30 to-ink/90"}`} />
      <div className="relative">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-chalk shadow-lg sm:h-24 sm:w-24"><Crest club={x.club} size={46} /></div>
        <div className="display mt-2 text-[1.35rem] leading-none text-chalk sm:text-4xl">{x.club?.shortName}</div>
        <div className="scoreboard-num mt-1 text-5xl leading-none text-chalk sm:text-7xl">{ordinal(x.row.position)}</div>
        <div className="mt-2 flex justify-center"><Form form={x.row.form} /></div>
      </div>
    </div>
  );

  return (
    <section id="tale-of-the-tape" className="poster relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="display text-lg tracking-[.3em] text-mackem">Tyne v Wear</div>
            <h2 className="tabloid text-[3.2rem] leading-[.85] sm:text-[6rem]">Tale of the tape</h2>
          </div>
          <span className="stamp text-mackem">Verified by the table</span>
        </div>
        <p className="serif mt-2 text-xl italic">{headline}</p>

        <div className="relative mt-6 grid grid-cols-2 border-4 border-ink">
          {corner(n, false)}
          {corner(s, true)}
          <div className="vs absolute left-1/2 top-[22%] grid h-12 w-12 sm:top-[30%] -translate-x-1/2 -translate-y-1/2 place-items-center sm:h-20 sm:w-20">
            <span className="display-i text-2xl sm:text-4xl">V</span>
          </div>
        </div>

        <ul className="border-x-4 border-b-4 border-ink bg-[#f6f3ea]">
          {rows.map(([label, a, b, w]) => (
            <li key={label} className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-ink/20 px-3 py-2 sm:px-6">
              <span className={`scoreboard-num text-2xl sm:text-3xl ${w === -1 ? "text-ink" : "text-ink/40"}`}>{a}</span>
              <span className="display px-2 text-center text-sm uppercase tracking-wider text-ink/70 sm:text-base">{label}</span>
              <span className={`scoreboard-num text-right text-2xl sm:text-3xl ${w === 1 ? "text-mackem" : "text-ink/40"}`}>{b}</span>
            </li>
          ))}
        </ul>
        <p className="serif mt-3 text-lg">{h2hQuip(h2h.aWins, h2h.bWins, h2h.draws)}</p>

        <div className="mt-6 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <div className="display text-2xl leading-none">Who owns<br />the North East?</div>
          <div>
            <div className="flex h-10 overflow-hidden border-4 border-ink">
              <div className="stripes-bw bar-grow" style={{ width: `${scoreA}%` }} />
              <div className="stripes-rw flex-1" />
            </div>
            <div className="mt-1 flex justify-between font-mono text-sm font-bold">
              <span>NEWCASTLE {scoreA}</span>
              <span className="text-mackem">{100 - scoreA} SUNDERLAND</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/tyne" className="font-bold underline underline-offset-4">Every number, every season</Link>
          <div className="[&_button]:!border-ink [&_button]:!text-ink [&_a]:!border-ink [&_a]:!text-ink">
            <ShareBar path="/tyne" text={`Who owns the North East? Newcastle ${scoreA}, Sunderland ${100 - scoreA}. HOWAYSTATS.`} graphic="/api/og?type=tyne" />
          </div>
        </div>
      </div>
    </section>
  );
}
const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);

/* ─────────── 3. THE TEARS INDEX (exhibit) ─────────── */
export interface TearIndicatorView { key: string; label: string; value: string; available: boolean; score: number; source: string; sourceUrl?: string; line: string }

export function TearDepartment({
  title,
  caption,
  tears,
  reasons,
  pRel,
  oddsMove,
  children,
}: {
  title: string;
  caption: string;
  tears: { percent: number; tears: number; label: string; indicators: TearIndicatorView[] };
  reasons: string[];
  pRel?: number;
  oddsMove?: number;
  children?: React.ReactNode;
}) {
  const live = tears.indicators.filter((i) => i.available);
  const missing = tears.indicators.filter((i) => !i.available);
  return (
    <section id="tear-department" className="relative overflow-hidden bg-[#1a0204] edge-zig-top">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 55% at 50% 30%, rgba(224,22,31,.5), rgba(26,2,4,0) 70%)" }} />
      <div className="pointer-events-none absolute -right-10 top-10 hidden select-none font-[family-name:var(--font-display)] text-[16rem] font-black italic leading-none text-mackem/10 lg:block">TEARS</div>
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="specimen text-xs text-mist">The Mackem Tear Department · Specimen: Wearside supporters</div>
        <h2 className="tabloid mt-2 text-[3rem] leading-[.85] text-chalk sm:text-[6rem]">{title}</h2>
        <p className="serif mt-2 max-w-2xl text-xl italic text-mist">{caption}</p>

        <div className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(300px,420px)_1fr]">
          <div className="flex flex-col items-center">
            <TearJar percent={tears.percent} size={360} showCounts={false} />
            <div className="mt-2 text-center">
              <div className="scoreboard-num text-6xl leading-none text-chalk">{Math.round(tears.percent)}<span className="text-3xl">%</span></div>
              <div className="display mt-1 text-2xl text-mackem">{tears.label}</div>
              <div className="mt-1 text-xs text-silver">{tears.tears.toLocaleString("en-GB")} tears · made up, obviously. The stats underneath aren&apos;t.</div>
            </div>
          </div>

          <div className="grid gap-4">
            {reasons.length > 0 && (
              <div className="relative bg-chalk p-4 text-ink shadow-[6px_6px_0_#e0161f]">
                <span className="tape" />
                <div className="specimen text-[11px] text-mackem">Latest from the Wear</div>
                <ul className="mt-1 space-y-1 text-sm font-semibold">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
            {pRel !== undefined && (
              <div className="flex items-end gap-4">
                <div>
                  <div className="specimen text-[11px] text-mist">Chance of going down</div>
                  <div className="scoreboard-num text-6xl leading-none text-mackem">{Math.round(pRel * 100)}%</div>
                </div>
                {oddsMove ? <div className={`pb-1 text-sm ${oddsMove > 0 ? "text-chalk" : "text-pitch"}`}>{oddsMove > 0 ? "▲ up" : "▼ down"} {Math.abs(oddsMove)} since the last model run</div> : null}
              </div>
            )}
          </div>
        </div>

        {/* the evidence */}
        <div className="mt-10">
          <div className="specimen text-xs text-mist">The evidence · what their supporters have got to cry about</div>
          <ul className="mt-3 grid gap-px bg-mackem/30 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((i) => (
              <li key={i.key} className="bg-[#1a0204] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-mist">{i.label}</span>
                  <span className="scoreboard-num text-2xl text-chalk">{i.value}</span>
                </div>
                <div className="mt-2 h-1.5 bg-black/60"><div className="h-full bg-mackem" style={{ width: `${Math.round(i.score * 100)}%` }} /></div>
                <p className="mt-2 text-[0.95rem] text-chalk">{i.line}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-silver">Source: {i.sourceUrl ? <a className="underline" href={i.sourceUrl} target="_blank" rel="noopener noreferrer">{i.source}</a> : i.source}</p>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-silver">
              {missing.map((i) => (
                <li key={i.key}><span className="text-mist">{i.label}:</span> unavailable — {i.line}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ShareBar path="/tear-jar" text={`The Mackem Tears Index is at ${Math.round(tears.percent)}%. ${tears.label} HOWAYSTATS.`} graphic="/api/og?type=jar" />
          <Link href="/tear-jar" className="text-sm text-mist underline underline-offset-4">How the Tears Index works</Link>
        </div>
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

/* ─────────── 4. THE DROP ZONE ─────────── */
export function DropZone({
  headline,
  table,
  clubs,
  focusId,
  stats,
  pips,
  next,
  safety,
  summary,
}: {
  headline: string;
  table: StandingRow[];
  clubs: Map<number, Club>;
  focusId: number;
  stats: { label: string; value: string; red?: boolean }[];
  pips: ("W" | "D" | "L" | null)[];
  next: { f: Fixture; opp: string; home: boolean; difficulty: number | null }[];
  safety: string;
  summary?: string;
}) {
  const n = table.length;
  const bottom = table.slice(Math.max(0, n - 7));
  const focusForm = (table.find((r) => r.clubId === focusId)?.form ?? []).join("");
  const fq = formQuip(focusForm, focusForm + n);
  return (
    <section className="relative bg-ink">
      <div className="hazard h-5" />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="display text-lg tracking-[.3em] text-mackem">The Drop Zone</div>
            <h2 className="tabloid text-[2.8rem] leading-[.85] sm:text-[5rem]">{headline}</h2>
            {summary && <p className="serif mt-3 text-lg text-mist">{summary}</p>}
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
              {stats.map((s) => (
                <div key={s.label} className="border-l-4 border-mackem pl-3">
                  <div className="text-sm text-silver">{s.label}</div>
                  <div className={`scoreboard-num text-3xl ${s.red ? "text-mackem" : "text-chalk"}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="mb-1 flex justify-between text-sm text-silver"><span>The season so far</span><span>{pips.filter((p) => !p).length} to play</span></div>
              <div className="flex gap-[3px]">{pips.map((p, i) => <span key={i} className={`h-6 flex-1 ${p === "W" ? "bg-chalk" : p === "D" ? "bg-iron" : p === "L" ? "bg-mackem" : "bg-slate"}`} />)}</div>
              <p className="mt-1 text-xs text-silver">Red defeat · grey draw · white win · dark still to play (league only)</p>
              {fq && <p className="serif mt-3 text-lg text-mist"><span className="font-mono text-sm font-bold text-mackem">LAST FIVE {focusForm.split("").join(" ")}</span> · {fq}</p>}
            </div>
          </div>

          {/* the trapdoor: bottom of the table */}
          <div>
            <div className="border-4 border-chalk">
              {bottom.map((r) => {
                const rel = r.position > n - 3;
                const me = r.clubId === focusId;
                return (
                  <div key={r.clubId}>
                    {r.position === n - 2 && (
                      <div className="hazard-thin relative h-8">
                        <span className="display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-ink px-2 text-sm tracking-[.25em] text-chalk">Trapdoor</span>
                      </div>
                    )}
                    <div className={`grid grid-cols-[2.2rem_auto_1fr_auto] items-center gap-2 px-3 py-2.5 ${me ? "bg-mackem text-chalk" : rel ? "bg-blood/40" : ""}`}>
                      <span className="scoreboard-num text-lg">{r.position}</span>
                      <Crest club={clubs.get(r.clubId)} size={20} />
                      <span className="display truncate text-xl">{clubs.get(r.clubId)?.shortName}</span>
                      <span className="scoreboard-num text-xl">{r.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6">
              <div className="display mb-2 text-xl">Next up for them</div>
              <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {next.map(({ f, opp, home, difficulty }) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate"><span className="display text-lg">{home ? "v" : "at"} {opp}</span> <span className="text-xs text-silver">{f.status === "postponed" ? "Postponed" : ukDay(f.kickoff)}{(f.leagueId ?? 39) !== 39 ? ` · ${f.competition}` : ""}</span></span>
                    {difficulty != null && <span className="flex gap-[3px]" aria-label={`Difficulty ${difficulty} of 5`}>{[1, 2, 3, 4, 5].map((k) => <span key={k} className={`h-3 w-2 ${k <= difficulty ? (difficulty >= 4 ? "bg-mackem" : "bg-chalk") : "bg-slate"}`} />)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-mist">{safety} <Link href="/mackem-watch" className="text-chalk underline underline-offset-4">Full Sunderland Watch</Link></p>
      </div>
      <div className="hazard h-5" />
    </section>
  );
}

/* ─────────── 5. EUROPEAN NIGHTS ─────────── */
export function EuropeanNights({ headline, club, row, pred, next, line }: { headline: string; club?: Club; row: StandingRow; pred?: Prediction; next: { f: Fixture; opp: string; home: boolean }[]; line?: string }) {
  return (
    <section className="euro-night relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-2"><Crest club={club} size={24} /><span className="display text-lg tracking-[.3em] text-silver">Newcastle · European Nights</span></div>
          <h2 className="serif mt-2 text-[2.6rem] italic leading-[.95] sm:text-[4.4rem]">{headline}</h2>
          {line && <p className="mt-3 text-lg text-mist">{line}</p>}
          <div className="mt-6 flex items-end gap-4">
            <div>
              <div className="text-sm text-silver">Newcastle&apos;s chance of a European place</div>
              <div className="scoreboard-num text-[5.5rem] leading-none sm:text-[7rem]">{pred ? `${Math.round(pred.pTop7 * 100)}%` : "—"}</div>
            </div>
            {pred && (
              <div className="pb-3 text-sm text-mist">
                Top four {Math.round(pred.pTop4 * 100)}%<br />Top six {Math.round(pred.pTop6 * 100)}%<br />Projected {ordinal(pred.projectedPosition)}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-silver">Usually 5th–7th gets Europe; cup winners can shift it. Chances from 50,000 simulated seasons.</p>
        </div>
        <div className="grid content-start gap-5">
          <div className="grid grid-cols-3 gap-3 border-y border-[var(--line-strong)] py-4">
            <div><div className="text-xs text-silver">Position</div><div className="scoreboard-num text-3xl">{ordinal(row.position)}</div></div>
            <div><div className="text-xs text-silver">Points</div><div className="scoreboard-num text-3xl">{row.points}</div></div>
            <div><div className="text-xs text-silver">Goals</div><div className="scoreboard-num text-3xl">{row.goalsFor}–{row.goalsAgainst}</div></div>
          </div>
          <div><div className="mb-1 text-xs text-silver">Form</div><Form form={row.form} size="lg" /></div>
          <div>
            <div className="display mb-1 text-xl">Next up</div>
            <ul className="divide-y divide-[var(--line)]">
              {next.map(({ f, opp, home }) => (
                <li key={f.id} className="flex justify-between py-2 text-sm"><span className="display text-lg">{home ? "v" : "at"} {opp}</span><span className="text-silver">{ukDay(f.kickoff)}{(f.leagueId ?? 39) !== 39 ? ` · ${f.competition}` : ""}</span></li>
              ))}
            </ul>
          </div>
          <Link href="/newcastle" className="text-sm underline underline-offset-4">Newcastle dashboard</Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────── 6. WEARSIDE WOES (newsprint) ─────────── */
export function WearsideWoes({ title, stories }: { title: string; stories: NewsArticle[] }) {
  const [lead, ...rest] = stories;
  return (
    <section className="newsprint edge-torn-bottom halftone relative">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-10">
        <div className="flex items-end justify-between border-b-4 border-double border-ink pb-2">
          <h2 className="font-[family-name:var(--font-serif4)] text-[2.6rem] font-semibold leading-none tracking-tight sm:text-[4.5rem]">{title}</h2>
          <span className="stamp hidden text-mackem sm:inline-block">Real news · our opinion</span>
        </div>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink/60">Real stories from real publishers, linked. Facts are theirs. The headlines and the cheek are ours.</p>
        {!lead ? (
          <p className="serif mt-6 text-xl">{EMPTY.woes}</p>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:divide-x lg:divide-ink/30">
            <article className="lg:pr-8">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase text-ink/70">
                {lead.breaking && <span className="bg-mackem px-1.5 py-0.5 text-chalk">Breaking</span>}
                <span>{lead.source}{lead.publishedAt ? ` · ${ukDay(lead.publishedAt)}` : ""}</span>
              </div>
              <h3 className="tabloid mt-2 text-[2.6rem] leading-[.88] sm:text-[4rem]"><Link href={`/news/${lead.slug}`} className="hover:underline">{lead.howayHeadline ?? lead.originalHeadline}</Link></h3>
              <p className="mt-3 border-l-4 border-mackem pl-3 text-sm"><span className="font-bold uppercase">What they said:</span> <a href={lead.url} target="_blank" rel="noopener noreferrer" className="underline">{lead.originalHeadline}</a></p>
              {lead.howayCommentary && <p className="serif mt-4 text-xl leading-snug first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-bold first-letter:leading-[.8] first-letter:text-mackem">{lead.howayCommentary}</p>}
              {lead.keyFacts.length > 0 && (
                <div className="mt-4 border-t border-ink/30 pt-3">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider">The facts, from {lead.source}</div>
                  <ul className="mt-1 space-y-1 text-sm">{lead.keyFacts.map((k) => <li key={k}>■ {k}</li>)}</ul>
                </div>
              )}
              {lead.punchline && <p className="tabloid mt-4 text-2xl text-mackem sm:text-3xl">{lead.punchline}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={lead.url} target="_blank" rel="noopener noreferrer" className="display bg-ink px-3 py-1.5 text-lg text-chalk">Read it at {lead.source}</a>
                <div className="[&_button]:!border-ink [&_button]:!text-ink [&_a]:!border-ink [&_a]:!text-ink"><ShareBar path={`/news/${lead.slug}`} text={lead.howayHeadline ?? lead.originalHeadline} graphic={`/api/og?type=news&slug=${lead.slug}`} trackId={lead.id} trackTable="news_articles" /></div>
              </div>
            </article>
            <div className="grid content-start gap-5">
              {rest.slice(0, 3).map((a) => (
                <article key={a.id} className="border-b border-ink/30 pb-4">
                  <h4 className="display text-2xl leading-tight"><Link href={`/news/${a.slug}`} className="hover:underline">{a.howayHeadline ?? a.originalHeadline}</Link></h4>
                  {a.howayCommentary && <p className="serif mt-1 line-clamp-3 text-base">{a.howayCommentary}</p>}
                  {a.punchline && <p className="mt-1 font-bold text-mackem">{a.punchline}</p>}
                  <p className="mt-1 font-mono text-[11px] text-ink/60">Original: <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline">{a.originalHeadline}</a> · {a.source}{a.publishedAt ? ` · ${ukDay(a.publishedAt)}` : ""}</p>
                </article>
              ))}
              <Link href="/news" className="display text-lg underline underline-offset-4">All of Wearside&apos;s woes</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────── 7. THE TERRACE (sticker wall) ─────────── */
export function Terrace({ title, featured, fromArchive, memes, original }: { title: string; featured?: Meme | null; fromArchive?: boolean; memes: Meme[]; original?: { src: string; alt: string; share: string } }) {
  const tilt = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
  return (
    <section className="seats relative bg-coal">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="masthead text-[3.4rem] text-chalk sm:text-[6rem]">{title.split(":")[0]}</h2>
          <Sticker tone="white" className="-rotate-3 px-3 py-1 text-base">Memes · humour · shareables</Sticker>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured && <Polaroid m={featured} tilt="-rotate-1" badge={fromArchive ? "From the archive" : "Meme of the day"} big />}
          {original && (
            <figure className="relative rotate-1 bg-chalk p-3 pb-4 text-ink shadow-[0_14px_30px_rgba(0,0,0,.5)]">
              <span className="tape" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={original.src} alt={original.alt} className="w-full" loading="lazy" />
              <figcaption className="mt-2 flex items-center justify-between gap-2">
                <span className="display text-lg">HOWAYSTATS original</span>
                <span className="text-xs">made from today&apos;s numbers</span>
              </figcaption>
            </figure>
          )}
          {memes.slice(0, 4).map((m, i) => <Polaroid key={m.id} m={m} tilt={tilt[i % tilt.length]} />)}
          {!featured && !memes.length && (
            <div className="relative -rotate-1 bg-chalk p-5 text-ink">
              <span className="tape" />
              <p className="display text-2xl">Nowt on the wall today.</p>
              <p className="mt-1 text-sm">{EMPTY.terrace} <Link href="/memes" className="font-bold underline">Hand one in</Link>.</p>
            </div>
          )}
        </div>
        <Link href="/memes" className="display mt-8 inline-block text-xl underline underline-offset-4">The full Terrace · submit one</Link>
      </div>
    </section>
  );
}

function Polaroid({ m, tilt, badge, big = false }: { m: Meme; tilt: string; badge?: string; big?: boolean }) {
  return (
    <figure className={`relative ${tilt} bg-chalk p-3 pb-4 text-ink shadow-[0_14px_30px_rgba(0,0,0,.5)] ${big ? "sm:col-span-2 lg:col-span-1" : ""}`} id={m.id}>
      <span className="tape" />
      {badge && <Sticker className="round absolute -right-3 -top-3 z-10 h-16 w-16 rotate-12 text-[.7rem]">{badge}</Sticker>}
      {m.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.mediaUrl} alt={m.title} loading="lazy" className="max-h-80 w-full bg-black object-contain" />
      ) : (
        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="display grid h-40 place-items-center bg-ink text-xl text-chalk">View on source</a>
      )}
      <figcaption className="mt-2">
        {m.caption && <p className="display text-xl leading-tight">{m.caption}</p>}
        <p className="text-xs text-ink/70">{m.source === "community" ? `Sent in${m.submittedBy ? ` by ${m.submittedBy}` : ""}` : <>By <a className="underline" href={m.authorUrl ?? m.sourceUrl} target="_blank" rel="noopener noreferrer">{m.author ?? m.source}</a> · <a className="underline" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">source</a></>}{m.source === "giphy" ? " · Powered by GIPHY" : ""}</p>
        <div className="mt-2 [&_button]:!border-ink [&_button]:!text-ink [&_a]:!border-ink [&_a]:!text-ink"><ShareBar path={`/memes#${m.id}`} text={m.caption ?? m.title} trackId={m.id} trackTable="memes" /></div>
      </figcaption>
    </figure>
  );
}

/* ─────────── 8. THE HOWAYSTATS WIRE ─────────── */
export function Wire({ items }: { items: { id: string; at: string | null; tag: string; text: string; href: string; red?: boolean }[] }) {
  if (!items.length) return null;
  return (
    <section className="border-y border-[var(--line-strong)] bg-black">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <span className="live-dot" />
          <h2 className="font-mono text-xl font-bold uppercase tracking-[.2em]">The HOWAYSTATS Wire</h2>
        </div>
        <ul className="mt-4 divide-y divide-[var(--line)] font-mono text-sm">
          {items.map((i) => (
            <li key={i.id} className="grid grid-cols-[3.6rem_1fr] gap-3 py-2.5 sm:grid-cols-[5rem_8rem_1fr]">
              <span className="text-silver">{i.at ? new Date(i.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Europe/London" }) : ""}</span>
              <span className={`hidden uppercase sm:block ${i.red ? "text-mackem" : "text-chalk"}`}>{i.tag}</span>
              <Link href={i.href} className="hover:underline">{i.text}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
