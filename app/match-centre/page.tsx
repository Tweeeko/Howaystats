import type { Metadata } from "next";
import { getSnapshot } from "@/lib/database/queries";
import { buildLivePayload } from "@/lib/live";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { clubView, freshness, miseryView, ordinal, pct } from "@/lib/view";
import { LiveScoreboards } from "@/components/live";
import { FixtureTicket, Freshness, NotConnected, Stat, ukDateTime } from "@/components/football";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { TearJar } from "@/components/tear-jar";

export const revalidate = 30;
export const metadata: Metadata = { title: "Match Centre", description: "Live Newcastle and Sunderland scores, events and league implications." };

export default async function MatchCentre() {
  const [s, live] = await Promise.all([getSnapshot(), buildLivePayload(false)]);
  const nufc = clubView(s, NEWCASTLE_ID);
  const safc = clubView(s, SUNDERLAND_ID);
  const misery = miseryView(s);
  const derby = s.fixtures.find((f) => f.status !== "finished" && [f.homeId, f.awayId].includes(NEWCASTLE_ID) && [f.homeId, f.awayId].includes(SUNDERLAND_ID));
  const sunLive = live.fixtures.find((f) => f.home.id === SUNDERLAND_ID || f.away.id === SUNDERLAND_ID);
  // Howay of the Match: Newcastle's top scorer in a just-finished match, straight from provider events.
  const nufcDone = live.fixtures.find((f) => f.status === "finished" && (f.home.id === NEWCASTLE_ID || f.away.id === NEWCASTLE_ID));
  const scorers = new Map<string, number>();
  for (const e of nufcDone?.events ?? []) if (e.type === "Goal" && e.detail !== "Own Goal" && e.detail !== "Missed Penalty" && e.team_id === NEWCASTLE_ID && e.player) scorers.set(e.player, (scorers.get(e.player) ?? 0) + 1);
  const howay = [...scorers.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="display-i text-6xl sm:text-8xl">Match Centre</h1>
      <div className="mt-2"><Freshness {...freshness(s)} /></div>
      <PitchDivider />

      {derby && (
        <section className="mb-10 border-2 border-mackem bg-black/70 p-6 text-center">
          <div className="ribbon mx-auto inline-block text-lg">Derby day</div>
          <p className="tabloid mt-3 text-[clamp(3rem,10vw,7rem)]">The Tyne is ours.</p>
          <p className="display text-2xl text-mist">{s.clubs.get(derby.homeId)?.name} v {s.clubs.get(derby.awayId)?.name} · {ukDateTime(derby.kickoff)}</p>
          {nufc && safc && (
            <div className="mx-auto mt-5 grid max-w-xl grid-cols-2 gap-6 text-left">
              <Stat label="Newcastle" value={`${ordinal(nufc.row.position)} · ${nufc.row.points}pts`} sub={`form ${nufc.row.form.join("") || "—"}`} />
              <Stat label="Sunderland" value={`${ordinal(safc.row.position)} · ${safc.row.points}pts`} sub={`form ${safc.row.form.join("") || "—"}`} tone="mackem" />
            </div>
          )}
        </section>
      )}

      <SectionHead title="Live" sub="Newcastle & Sunderland" />
      {live.fixtures.length ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <LiveScoreboards initial={live} />
          <div className="grid content-start gap-4">
            {safc?.pred && (
              <div className="panel panel-top mackem p-4">
                <div className="kicker !text-mackem">Live Matchday Meltdown</div>
                <p className="mt-1 text-sm text-mist">Relegation probability (last model run, before this match): <span className="scoreboard-num text-chalk">{pct(safc.pred.pRelegation, 1)}</span>. Updated once the result is confirmed — we don&apos;t guess mid-match.</p>
              </div>
            )}
            {sunLive && misery && (
              <div className="panel flex justify-center p-4"><TearJar percent={misery.jar.percent} dropped={misery.jar.dropped} capacity={misery.jar.capacity} size={220} /></div>
            )}
            {howay && (
              <div className="panel panel-top p-4">
                <div className="kicker">Howay of the Match</div>
                <p className="display mt-1 text-3xl">{howay[0]}</p>
                <p className="text-sm text-mist">{howay[1]} goal{howay[1] > 1 ? "s" : ""} for the Toon, per the official match events.</p>
              </div>
            )}
            {nufc?.pred && (
              <div className="panel panel-top p-4">
                <div className="kicker">Geordie Glory</div>
                <p className="mt-1 text-sm text-mist">Top-six chance going in: <span className="scoreboard-num text-chalk">{pct(nufc.pred.pTop6, 1)}</span>. Points gained and the European movement land after full time.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="panel p-5 text-mist">No Newcastle or Sunderland match in progress. Live scores appear here automatically from the provider feed — never invented.</p>
      )}

      {!s.table.length && <div className="mt-8"><NotConnected /></div>}
      {[nufc, safc].map((c) =>
        c ? (
          <section key={c.id}>
            <PitchDivider />
            <SectionHead title={c.short} sub="Fixtures & results" mackem={c.id === SUNDERLAND_ID} />
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[...c.fixtures.recent.slice(0, 3).reverse(), ...c.fixtures.upcoming.slice(0, 5)].map((f) => (
                <FixtureTicket key={f.id} f={f} clubs={s.clubs} highlight={c.id} />
              ))}
            </div>
            {c.pred && (
              <p className="mt-2 font-mono text-xs uppercase text-silver">
                League implications: currently {ordinal(c.row.position)} · projected {ordinal(c.pred.projectedPosition)} · {c.id === SUNDERLAND_ID ? `relegation ${pct(c.pred.pRelegation, 1)}` : `top six ${pct(c.pred.pTop6, 1)}`}
              </p>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}
