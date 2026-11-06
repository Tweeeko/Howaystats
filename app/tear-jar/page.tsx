import type { Metadata } from "next";
import Link from "next/link";
import { getJarSeasons, getSnapshot } from "@/lib/database/queries";
import { miseryView } from "@/lib/view";
import { TearJar } from "@/components/tear-jar";
import { MiseryIndex } from "@/components/misery";
import { NotConnected, ukDay } from "@/components/football";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { ShareBar } from "@/components/share";
import { STADIUM_OF_LIGHT_CAPACITY, CAPACITY_SOURCE } from "@/lib/tears/index";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "The Mackem Tears Index",
  description: "How much Sunderland's supporters have got to cry about — measured from real, sourced stats.",
  openGraph: { images: ["/api/og?type=jar"] },
};

export default async function TearsIndexPage() {
  const s = await getSnapshot();
  const m = miseryView(s);
  const past = await getJarSeasons();
  if (!m) return <div className="mx-auto max-w-5xl px-4 py-10"><h1 className="tabloid text-6xl text-mackem">The Tears Index</h1><PitchDivider /><NotConnected /></div>;
  const t = m.tears;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="specimen text-xs text-silver">The Mackem Tear Department</div>
      <h1 className="tabloid text-6xl text-mackem sm:text-8xl">The Tears Index</h1>
      <div className="mt-4 max-w-2xl space-y-2 text-lg text-mist">
        <p>We don&apos;t measure Sunderland the club. We measure how much their supporters have got to cry about.</p>
        <p>Every figure below is real and sourced. Anything nobody publishes — TV audiences, away followings — is marked unavailable and left out. We divvent guess.</p>
      </div>

      <div className="mt-8 grid items-center gap-8 md:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="flex flex-col items-center gap-3">
          <TearJar percent={t.percent} size={320} />
          <ShareBar path="/tear-jar" text={`The Mackem Tears Index is at ${Math.round(t.percent)}%. ${t.label}`} graphic="/api/og?type=jar" />
        </div>
        <div>
          <div className="scoreboard-num text-8xl leading-none text-mackem">{Math.round(t.percent)}%</div>
          <p className="display mt-2 text-3xl">{t.label}</p>
          {t.latest && <p className="mt-3 text-mist"><span className="font-bold text-chalk">Last result:</span> {t.latest}</p>}
          <p className="mt-3 text-sm text-silver">Built from {t.available} indicator{t.available === 1 ? "" : "s"} we can measure right now. Each is scored 0–100% and weighted; derby defeats count most.</p>
        </div>
      </div>

      <PitchDivider />
      <SectionHead title="The evidence" sub="Figure · what it means · where it's from" mackem />
      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {t.indicators.map((i) => (
          <div key={i.key} className={`grid gap-2 py-4 sm:grid-cols-[1fr_auto] ${i.available ? "" : "opacity-60"}`}>
            <div>
              <div className="display text-xl">{i.label}</div>
              <p className="mt-1 text-chalk">{i.line}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-silver">
                Source: {i.sourceUrl ? <a className="underline" href={i.sourceUrl} target="_blank" rel="noopener noreferrer">{i.source}</a> : i.source}
              </p>
            </div>
            <div className="sm:text-right">
              <div className={`scoreboard-num text-3xl ${i.available ? "text-chalk" : "text-silver"}`}>{i.value}</div>
              {i.available && <div className="mt-1 h-1.5 w-40 bg-slate sm:ml-auto"><div className="h-full bg-mackem" style={{ width: `${Math.round(i.score * 100)}%` }} /></div>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-silver">
        Stadium of Light capacity {STADIUM_OF_LIGHT_CAPACITY.toLocaleString("en-GB")} per <a className="underline" href={CAPACITY_SOURCE.url} target="_blank" rel="noopener noreferrer">{CAPACITY_SOURCE.label}</a>.
        &ldquo;Tears&rdquo; is {Math.round(t.percent)} × 1,000 and entirely made up. <Link className="underline" href="/how-it-works#misery">Full method</Link>.
      </p>

      <PitchDivider />
      <SectionHead title="League points dropped, game by game" mackem />
      <div className="panel overflow-x-auto">
        <table className="pl-table min-w-[340px]">
          <thead><tr><th className="l">Date</th><th className="l">Result</th><th>Dropped</th></tr></thead>
          <tbody>
            {m.jar.history.map((h) => (
              <tr key={h.fixtureId}>
                <td className="l whitespace-nowrap font-mono text-xs">{ukDay(h.at)}</td>
                <td className="l">{h.label}</td>
                <td className={h.added ? "text-mackem" : "text-pitch"}>{h.added ? `+${h.added}` : "0"}</td>
              </tr>
            ))}
            {!m.jar.history.length && <tr><td colSpan={3} className="text-silver">No games yet this season.</td></tr>}
          </tbody>
        </table>
      </div>

      <PitchDivider />
      <div className="max-w-xl">
        <MiseryIndex score={m.score} label={m.label} movement={m.movement} biggest={m.biggest} spark={m.spark} parts={m.parts} />
      </div>

      {past.length > 0 && (
        <>
          <PitchDivider />
          <SectionHead title="Previous seasons" mackem />
          <div className="grid gap-3 sm:grid-cols-3">
            {past.map((p) => (
              <div key={p.season} className="panel p-4">
                <div className="text-sm text-silver">{p.season}/{String(p.season + 1).slice(2)}</div>
                <div className="scoreboard-num text-4xl text-mackem">{Number(p.final_percent).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
