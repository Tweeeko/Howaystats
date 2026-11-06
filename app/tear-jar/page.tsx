import type { Metadata } from "next";
import { getJarSeasons, getSnapshot } from "@/lib/database/queries";
import { miseryView } from "@/lib/view";
import { TearJar } from "@/components/tear-jar";
import { MiseryIndex } from "@/components/misery";
import { NotConnected, ukDay } from "@/components/football";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { ShareBar } from "@/components/share";

export const revalidate = 120;
export const metadata: Metadata = { title: "The Mackem Tear Jar", description: "Every point Sunderland drop goes in the jar.", openGraph: { images: ["/api/og?type=jar"] } };

export default async function TearJarPage() {
  const s = await getSnapshot();
  const m = miseryView(s);
  const past = await getJarSeasons();
  if (!m) return <div className="mx-auto max-w-5xl px-4 py-10"><h1 className="display-i text-6xl text-mackem">The Tear Jar</h1><PitchDivider /><NotConnected /></div>;
  const j = m.jar;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="tabloid text-6xl text-mackem sm:text-8xl">The Tear Jar</h1>
      <div className="mt-4 max-w-2xl space-y-2 text-lg text-mist">
        <p>Every point Sunderland drop goes in the jar. Lose: 3 in. Draw: 2 in. Win: nothing.</p>
        <p>It holds {j.capacity}. That&apos;s the most a club can drop over a {j.capacity / 3 + 38 / 3 > 0 ? 38 : 38}-game season and still finish on 38 points, the old survival mark. Fill it and 38 is gone.</p>
        <p className="text-silver">Empties at the start of every season. The tears are made up. The points aren&apos;t.</p>
      </div>
      <PitchDivider />
      <div className="grid gap-8 md:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="panel panel-top mackem flex flex-col items-center gap-3 p-5">
          <TearJar percent={j.percent} dropped={j.dropped} capacity={j.capacity} size={320} />
          <p className="text-center text-mist">{j.line}</p>
          <ShareBar path="/tear-jar" text={`Sunderland have dropped ${j.dropped} points. The Tear Jar is ${j.percent.toFixed(0)}% full.`} graphic="/api/og?type=jar" />
        </div>
        <div>
          <SectionHead title="Game by game" mackem />
          <div className="panel overflow-x-auto">
            <table className="pl-table min-w-[340px]">
              <thead><tr><th className="l">Date</th><th className="l">Result</th><th>In</th><th>Jar</th></tr></thead>
              <tbody>
                {j.history.map((h) => (
                  <tr key={h.fixtureId}>
                    <td className="l whitespace-nowrap font-mono text-xs">{ukDay(h.at)}</td>
                    <td className="l">{h.label}</td>
                    <td className={h.added ? "text-mackem" : "text-pitch"}>+{h.added}</td>
                    <td className="pts">{h.percent.toFixed(0)}%</td>
                  </tr>
                ))}
                {!j.history.length && <tr><td colSpan={4} className="text-silver">No games yet this season.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
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
                <div className="text-sm text-silver">{p.tears_collected} points dropped{p.overflowed ? " · overflowed" : ""}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
