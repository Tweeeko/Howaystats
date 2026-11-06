import type { Metadata } from "next";
import Link from "next/link";
import { getSnapshot } from "@/lib/database/queries";
import { NEWCASTLE_ID } from "@/lib/football/provider";
import { clubView, freshness, gloryView, miseryView, opponentDifficulty, ordinal, pct } from "@/lib/view";
import { Crest, FixtureTicket, Form, Freshness, NotConnected, Stat } from "@/components/football";
import { PositionChart } from "@/components/tyne";
import { HappinessMeter } from "@/components/misery";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { ShareBar } from "@/components/share";

export const revalidate = 60;
export const metadata: Metadata = { title: "Newcastle United dashboard", description: "Newcastle United: position, form, fixtures and European qualification probabilities from 50,000 simulated seasons." };

export default async function Newcastle() {
  const s = await getSnapshot();
  const c = clubView(s, NEWCASTLE_ID);
  const glory = gloryView(s);
  const happy = miseryView(s)?.happiness;
  if (!c) return <div className="mx-auto max-w-7xl px-4 py-10"><h1 className="display-i text-7xl">Newcastle United</h1><PitchDivider /><NotConnected /></div>;
  const p = c.pred;
  const avgDiff = p ? Math.round(p.fixtureDifficulty * 100) : null;
  const delta = p && c.prev ? p.pTop6 - c.prev.pTop6 : null;

  return (
    <div>
      <section className="seats border-b border-[var(--line)] bg-black/60">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-[auto_1fr] md:items-center">
          <Crest club={s.clubs.get(NEWCASTLE_ID)} size={96} />
          <div>
            <div className="kicker">The Toon · {s.season}/{String(s.season + 1).slice(2)}</div>
            <h1 className="display-i text-6xl leading-none sm:text-8xl">Newcastle United</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4"><Form form={c.row.form} size="lg" /><Freshness {...freshness(s)} /></div>
          </div>
        </div>
        <div className="stripe-bar" />
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Position" value={ordinal(c.row.position)} />
          <Stat label="Points" value={c.row.points} />
          <Stat label="Played" value={c.row.played} />
          <Stat label="W-D-L" value={`${c.row.won}-${c.row.drawn}-${c.row.lost}`} />
          <Stat label="Goal diff" value={c.row.goalDifference > 0 ? `+${c.row.goalDifference}` : c.row.goalDifference} />
          <Stat label="Remaining" value={c.remaining} />
          <Stat label="Home" value={`${c.row.home.points}`} sub="points" />
          <Stat label="Away" value={`${c.row.away.points}`} sub="points" />
        </div>

        <PitchDivider />
        <SectionHead title="Geordie Glory Meter" sub="Driven by the model, not by hope" />
        <div className="panel panel-top grid gap-6 p-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="flex items-end gap-1.5">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="w-10" style={{ height: 30 + k * 22, background: glory && k <= glory.level ? "var(--stripe)" : "rgba(244,244,240,.1)" }} />
              ))}
              <span className="scoreboard-num ml-3 text-6xl">{glory?.level ?? "–"}<span className="text-2xl text-silver">/5</span></span>
            </div>
            <p className="tabloid mt-4 text-4xl sm:text-5xl">{glory?.line ?? "Model warming up."}</p>
            {happy && <div className="mt-5 max-w-md"><HappinessMeter {...happy} /></div>}
          </div>
          {p && (
            <div className="grid grid-cols-2 content-start gap-5">
              <Stat label="Top four" value={pct(p.pTop4, 1)} />
              <Stat label="Top five" value={pct(p.pTop5, 1)} sub="if England earn a 5th CL place" />
              <Stat label="Top six" value={pct(p.pTop6, 1)} sub={delta !== null ? `${delta >= 0 ? "▲" : "▼"} ${(Math.abs(delta) * 100).toFixed(1)} pts since last run` : undefined} tone="pitch" />
              <Stat label="Top seven" value={pct(p.pTop7, 1)} sub="typical European places" />
              <Stat label="Top ten" value={pct(p.pTop10, 1)} />
              <Stat label="Relegation" value={pct(p.pRelegation, 1)} />
              <Stat label="Projected finish" value={ordinal(p.projectedPosition)} sub={`average ${p.expectedPosition.toFixed(1)}`} />
              <Stat label="Expected points" value={p.expectedPoints.toFixed(1)} sub={`80% range ${p.pointsP10}–${p.pointsP90}`} />
            </div>
          )}
        </div>
        {p && (
          <div className="mt-6 panel p-5">
            <PositionChart probs={p.positionProbs} highlight={c.row.position} />
            <p className="mt-3 text-xs text-silver">European qualification also depends on cup winners and coefficient places, so league-position probabilities are shown alongside a &ldquo;typical&rdquo; top-seven figure. <Link href="/how-it-works" className="underline">How the model works</Link>.</p>
          </div>
        )}
        <div className="mt-4">
          <ShareBar path="/newcastle" text={`Newcastle: ${ordinal(c.row.position)}, ${c.row.points} pts${p ? `, top-six chance ${pct(p.pTop6)}` : ""}. Howay the lads.`} graphic="/api/og?type=newcastle" />
        </div>

        <PitchDivider />
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHead title="Up Next" sub={avgDiff !== null ? `Run-in difficulty ${avgDiff}/100` : "Fixtures"} />
            <div className="grid gap-3 sm:grid-cols-2">
              {c.fixtures.upcoming.slice(0, 8).map((f) => <FixtureTicket key={f.id} f={f} clubs={s.clubs} difficulty={opponentDifficulty(s, f, c.id)} highlight={c.id} />)}
            </div>
          </div>
          <div>
            <SectionHead title="Results" sub="Most recent first" />
            <div className="grid gap-3 sm:grid-cols-2">{c.fixtures.recent.slice(0, 8).map((f) => <FixtureTicket key={f.id} f={f} clubs={s.clubs} highlight={c.id} />)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
