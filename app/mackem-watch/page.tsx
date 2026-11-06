import type { Metadata } from "next";
import Link from "next/link";
import { getSnapshot } from "@/lib/database/queries";
import { SUNDERLAND_ID } from "@/lib/football/provider";
import { marginOfError } from "@/lib/predictions/montecarlo";
import { clubName, clubView, safetyLine, freshness, miseryView, opponentDifficulty, ordinal, pct } from "@/lib/view";
import { Crest, FixtureTicket, Form, Freshness, NotConnected, Stat, ukDay } from "@/components/football";
import { PositionChart } from "@/components/tyne";
import { DangerGauge, MiseryIndex } from "@/components/misery";
import { TearJar } from "@/components/tear-jar";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { ShareBar } from "@/components/share";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Mackem Watch — Sunderland relegation probability",
  description: "Live Sunderland relegation watch: probability from 50,000 simulated seasons, points from safety, fixture difficulty and the Mackem Tear Jar.",
  openGraph: { images: ["/api/og?type=relegation"] },
};

export default async function MackemWatch() {
  const s = await getSnapshot();
  const c = clubView(s, SUNDERLAND_ID);
  const m = miseryView(s);
  if (!c) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="display-i text-7xl text-mackem">Mackem Watch</h1>
        <PitchDivider />
        {s.table.length ? <p className="display text-3xl">Sunderland aren&apos;t in this season&apos;s Premier League table. The watch resumes when they are.</p> : <NotConnected />}
      </div>
    );
  }
  const p = c.pred;
  const change = p && c.prev ? p.pRelegation - c.prev.pRelegation : null;
  const n = s.run?.simulations ?? 50_000;
  const above = c.distances?.teamAboveId ? clubName(s, c.distances.teamAboveId) : null;
  const hardest = c.fixtures.upcoming
    .map((f) => ({ f, d: opponentDifficulty(s, f, c.id) ?? 0 }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 5);
  const opponents = c.fixtures.upcoming.filter((f) => f.status !== "live");

  return (
    <div>
      {/* Main visual: the probability */}
      <section className="relative overflow-hidden border-b border-mackem/40 bg-gradient-to-b from-blood/50 to-black/80">
        <div className="stripe-bar mackem" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="flex flex-wrap items-center gap-3">
            <Crest club={s.clubs.get(SUNDERLAND_ID)} size={40} />
            <span className="display-i text-3xl">Sunderland Relegation Watch</span>
            <Freshness {...freshness(s)} />
          </div>
          {p ? (
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
              <div>
                <div className="kicker !text-mist">Relegation risk</div>
                <div className="scoreboard-num text-[clamp(6rem,24vw,15rem)] leading-[.8] text-mackem drop-shadow-[0_0_40px_rgba(224,22,31,.35)]">
                  {(p.pRelegation * 100).toFixed(0)}<span className="text-[0.45em]">%</span>
                </div>
                <p className="tabloid mt-4 text-4xl sm:text-6xl">{m?.verdict}</p>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Stat label="Survival chance" value={pct(p.pSurvival)} />
                <Stat label="Projected finish" value={ordinal(p.projectedPosition)} tone={p.projectedPosition > 17 ? "mackem" : undefined} />
                <Stat label="Expected points" value={p.expectedPoints.toFixed(1)} sub={`80% range ${p.pointsP10}–${p.pointsP90}`} />
                <Stat
                  label="Since last model run"
                  value={change === null ? "—" : `${change > 0 ? "▲" : change < 0 ? "▼" : "■"} ${(Math.abs(change) * 100).toFixed(1)}`}
                  sub="percentage points"
                  tone={change !== null && change > 0 ? "mackem" : "pitch"}
                />
                <p className="col-span-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-silver">
                  {n.toLocaleString("en-GB")} simulated seasons · ±{(marginOfError(p.pRelegation, n) * 100).toFixed(1)} pts simulation error · model confidence {s.run?.confidence}
                  {s.run?.notes ? ` — ${s.run.notes}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="display mt-6 text-3xl">Probabilities appear after the first model run.</p>
          )}
          {p && (
            <div className="mt-6">
              <ShareBar path="/mackem-watch" text={`Sunderland relegation probability: ${(p.pRelegation * 100).toFixed(0)}%. HOWAYSTATS — the numbers don't lie.`} graphic="/api/og?type=relegation" />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel panel-top mackem p-5">
            <SectionHead title="Danger Gauge" sub="Comfortable → Absolute Panic" mackem />
            {p && m ? <DangerGauge p={p.pRelegation} level={m.danger} /> : <p className="text-silver">Waiting for the model.</p>}
          </div>
          <div className="panel panel-top mackem p-5">
            <SectionHead title="Championship Countdown" sub="The maths" mackem />
            <div className="grid grid-cols-2 gap-5">
              <Stat label="Games remaining" value={c.remaining} />
              <Stat label="Max possible pts" value={c.safety?.maxPossible ?? "—"} />
              <Stat label="To reach 38" value={Math.max(0, 38 - c.row.points)} sub="the usual survival mark" />
              <Stat label="Guaranteed safe on" value={c.safety && c.remaining <= 10 ? c.safety.target : "Too early"} tone="mackem" sub={c.safety && c.remaining <= 10 ? "points" : "maths kicks in late season"} />
            </div>
            <p className="display mt-5 text-2xl">
              {safetyLine(c)}
            </p>
            <p className="mt-2 text-xs text-silver">The guaranteed threshold assumes every rival wins every remaining game, so real safety usually arrives a little earlier.</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Position" value={ordinal(c.row.position)} tone={c.row.position > 17 ? "mackem" : undefined} />
          <Stat label="Points" value={c.row.points} />
          <Stat label="Played" value={c.row.played} />
          <Stat label="Points dropped" value={c.distances?.pointsDropped ?? "—"} tone="mackem" />
          <Stat label="Gap to 17th" value={c.distances ? (c.distances.toSeventeenth > 0 ? `-${c.distances.toSeventeenth}` : `+${-c.distances.toSeventeenth}`) : "—"} />
          <Stat label={above ? `To catch ${above}` : "Team above"} value={c.distances?.toTeamAbove ?? "—"} sub="points" />
          <Stat label="Top ten" value={pct(p?.pTop10, 1)} />
          <Stat label="Top six" value={pct(p?.pTop6, 1)} />
        </div>
        <div className="mt-4 flex items-center gap-3"><span className="kicker">Last five</span><Form form={c.row.form} size="lg" /></div>

        {p && (
          <>
            <PitchDivider />
            <SectionHead title="Where It Ends" sub="Finishing position distribution" mackem />
            <div className="panel p-5">
              <div className="mb-4 grid grid-cols-3 gap-4">
                <Stat label="Finish 18th" value={pct(p.p18, 1)} tone="mackem" />
                <Stat label="Finish 19th" value={pct(p.p19, 1)} tone="mackem" />
                <Stat label="Finish 20th" value={pct(p.p20, 1)} tone="mackem" />
              </div>
              <PositionChart probs={p.positionProbs} mackem highlight={c.row.position} />
            </div>
          </>
        )}

        {m && (
          <>
            <PitchDivider />
            <div className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
              <div className="panel panel-top mackem flex flex-col items-center p-5">
                <h2 className="display text-4xl">The Tear Jar</h2>
                <p className="text-center text-sm text-silver">Every point dropped goes in. Holds {m.jar.capacity}.</p>
                <TearJar percent={m.jar.percent} dropped={m.jar.dropped} capacity={m.jar.capacity} />
                <Link href="/tear-jar" className="display mt-3 text-lg underline underline-offset-4">Jar history →</Link>
              </div>
              <MiseryIndex score={m.score} label={m.label} movement={m.movement} biggest={m.biggest} spark={m.spark} parts={m.parts} />
            </div>
          </>
        )}

        <PitchDivider />
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHead title="Hardest Ahead" sub={p ? `Run-in difficulty ${Math.round(p.fixtureDifficulty * 100)}/100` : "Fixtures"} mackem />
            <div className="grid gap-3 sm:grid-cols-2">
              {hardest.map(({ f, d }) => <FixtureTicket key={f.id} f={f} clubs={s.clubs} difficulty={d} highlight={c.id} />)}
            </div>
          </div>
          <div>
            <SectionHead title="Recent Results" sub="The evidence" mackem />
            <div className="grid gap-3 sm:grid-cols-2">{c.fixtures.recent.slice(0, 6).map((f) => <FixtureTicket key={f.id} f={f} clubs={s.clubs} highlight={c.id} />)}</div>
          </div>
        </div>

        <PitchDivider />
        <SectionHead title="Remaining Opponents" sub={`${opponents.length} to play`} mackem />
        <div className="panel overflow-x-auto p-3">
          <table className="pl-table min-w-[480px]">
            <thead><tr><th className="l">Date</th><th className="l">Opponent</th><th>Venue</th><th>Opp. projected</th><th>Difficulty</th></tr></thead>
            <tbody>
              {opponents.map((f) => {
                const opp = f.homeId === c.id ? f.awayId : f.homeId;
                const d = opponentDifficulty(s, f, c.id);
                return (
                  <tr key={f.id}>
                    <td className="l font-mono text-xs">{f.status === "postponed" ? "Postponed" : ukDay(f.kickoff)}</td>
                    <td className="l"><span className="flex items-center gap-2"><Crest club={s.clubs.get(opp)} size={18} /><span className="display text-lg">{clubName(s, opp)}</span></span></td>
                    <td>{f.homeId === c.id ? "H" : "A"}</td>
                    <td>{s.predictions.get(opp) ? ordinal(s.predictions.get(opp)!.projectedPosition) : "—"}</td>
                    <td className={d && d >= 4 ? "text-mackem" : ""}>{d ?? "—"}/5</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-silver">All figures come from the live table and the published model. <Link href="/how-it-works" className="underline">How the predictions are calculated</Link>.</p>
      </div>
    </div>
  );
}
