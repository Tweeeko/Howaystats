import type { Metadata } from "next";
import { scheduleCatchUp } from "@/lib/catchup";
import Link from "next/link";
import { getSnapshot } from "@/lib/database/queries";
import { SUNDERLAND_ID } from "@/lib/football/provider";
import { clubName, clubView, meterView, ordinal, roastFacts, safetyLine } from "@/lib/view";
import { Roast } from "@/components/roast";
import { NotConnected } from "@/components/football";
import { Scoreboard } from "@/components/programme";
import { SectionTitle } from "@/components/stadium";
import { ShareBar } from "@/components/share";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Mackem Watch",
  description: "How Sunderland are getting on, from a Newcastle point of view. The Misery Meter, the relegation odds and every result.",
  openGraph: { images: ["/api/og?type=relegation"] },
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

export default async function MackemWatch() {
  const s = await getSnapshot();
  scheduleCatchUp();
  const c = clubView(s, SUNDERLAND_ID);
  const m = meterView(s);
  if (!c || !m) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="tabloid text-7xl">Mackem Watch</h1>
        <div className="mt-6">
          {s.table.length ? <p className="serif text-xl text-mist">Sunderland aren&apos;t in this season&apos;s Premier League. Shame, that.</p> : <NotConnected />}
        </div>
      </div>
    );
  }
  const name = (id: number) => clubName(s, id);
  const p = c.pred;
  const change = p && c.prev ? p.pRelegation - c.prev.pRelegation : null;
  const relPct = p ? Math.round(p.pRelegation * 100) : null;
  const relLine =
    relPct === null
      ? null
      : relPct >= 60
        ? "Start learning the Championship grounds, lads. HAHAHA."
        : relPct >= 30
          ? "Proper danger. We're watching with a brew and a big grin."
          : relPct >= 10
            ? "Not likely. Not impossible either. We can dream."
            : "Hardly any chance. Fucking gutted.";

  const results = c.fixtures.recent.slice(0, 8);
  const roast = roastFacts(s);
  const next = c.fixtures.upcoming.slice(0, 5);

  return (
    <>
    {roast && <Roast f={roast} />}
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="tabloid text-[clamp(3.4rem,11vw,7rem)]">Mackem Watch</h2>
      <p className="serif mt-2 max-w-2xl text-xl text-mist">
        Sunderland, {ordinal(c.row.position)} in the league on {c.row.points} points. Here&apos;s the state of them.
      </p>

      <div className="mt-8">
        <Scoreboard m={m} full />
      </div>

      {relPct !== null && (
        <section className="mt-12">
          <SectionTitle title="Chance of going down" mackem />
          <div className="board flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
            <p className="led text-[clamp(5rem,20vw,9rem)] leading-none !text-mackem" style={{ textShadow: "0 0 18px rgba(224,22,31,.55)" }}>{relPct}%</p>
            <div>
              <p className="display text-3xl">{relLine}</p>
              {change !== null && Math.abs(change) >= 0.01 && (
                <p className="mt-2 text-mist">
                  {change > 0 ? "Up" : "Down"} {Math.abs(Math.round(change * 100))} points since the last run{change > 0 ? ". Lovely. HAHAHA." : ". Boo. Fluke."}
                </p>
              )}
              <p className="mt-2 text-mist">{safetyLine(c)}</p>
              <p className="mt-3 text-xs text-silver">
                From playing the rest of the season {(s.run?.simulations ?? 50_000).toLocaleString("en-GB")} times. <Link href="/how-it-works" className="underline">How</Link>
              </p>
              <div className="mt-4">
                <ShareBar path="/mackem-watch" text={`Sunderland's chance of going down: ${relPct}%. ${relLine}`} graphic="/api/og?type=relegation" />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <SectionTitle title="How it's gone" mackem />
          {results.length ? (
            <ul className="panel divide-y divide-[var(--line)]">
              {results.map((f) => {
                const home = f.homeId === SUNDERLAND_ID;
                const gf = home ? f.homeGoals! : f.awayGoals!;
                const ga = home ? f.awayGoals! : f.homeGoals!;
                const r = gf > ga ? "W" : gf === ga ? "D" : "L";
                return (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`form-pip mackem ${r}`}>{r}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {home ? `v ${name(f.awayId)}` : `at ${name(f.homeId)}`}
                      {(f.leagueId ?? 39) !== 39 && f.competition ? <span className="text-silver"> · {f.competition}</span> : null}
                    </span>
                    <span className="scoreboard-num">{gf}-{ga}</span>
                    <span className="w-14 text-right text-xs text-silver">{day(f.kickoff)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="panel p-5 text-mist">No games played yet.</p>
          )}
        </section>
        <section>
          <SectionTitle title="Coming up for them" mackem />
          {next.length ? (
            <ul className="panel divide-y divide-[var(--line)]">
              {next.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate">
                    {f.homeId === SUNDERLAND_ID ? `v ${name(f.awayId)}` : `at ${name(f.homeId)}`}
                    {(f.leagueId ?? 39) !== 39 && f.competition ? <span className="text-silver"> · {f.competition}</span> : null}
                  </span>
                  <span className="text-sm text-silver">{day(f.kickoff)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel p-5 text-mist">Nothing scheduled. Enjoy the break, they won&apos;t.</p>
          )}
        </section>
      </div>
    </div>
    </>
  );
}
