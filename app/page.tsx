import Link from "next/link";
import { getNews, getSnapshot } from "@/lib/database/queries";
import { buildLivePayload } from "@/lib/live";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { backPageHeadline } from "@/lib/headline";
import { clubName, clubView, meterView, ordinal } from "@/lib/view";
import type { Fixture } from "@/lib/types";
import { NotConnected } from "@/components/football";
import { LiveScoreboards } from "@/components/live";
import { MeterCompact } from "@/components/meter";
import { LeadStory, StoryCard } from "@/components/news";
import { SectionTitle } from "@/components/stadium";

export const revalidate = 60;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" }) +
  ", " +
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function Home() {
  const s = await getSnapshot();
  const [sunNews, toonNews, live] = await Promise.all([
    getNews({ club: "sunderland", limit: 4 }),
    getNews({ club: "newcastle", limit: 2 }),
    buildLivePayload(false),
  ]);
  const name = (id: number) => clubName(s, id);
  const nufc = clubView(s, NEWCASTLE_ID);
  const safc = clubView(s, SUNDERLAND_ID);
  const meter = meterView(s);
  const head = backPageHeadline({
    fixtures: [...s.fixtures, ...s.cupFixtures],
    nufc: s.newcastle,
    safc: s.sunderland,
    nufcId: NEWCASTLE_ID,
    safcId: SUNDERLAND_ID,
    name,
    leagueSize: s.table.length,
  });

  const result = (f: Fixture | undefined, id: number) => {
    if (!f) return null;
    const home = f.homeId === id;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    return { f, gf, ga, r: gf > ga ? "W" : gf === ga ? "D" : "L", opp: name(home ? f.awayId : f.homeId), home, comp: (f.leagueId ?? 39) === 39 ? null : f.competition };
  };
  const nLast = nufc ? result(nufc.fixtures.recent[0], NEWCASTLE_ID) : null;
  const nNext = nufc?.fixtures.upcoming[0];
  const derbies = [...s.fixtures, ...s.cupFixtures]
    .filter((f) => f.status === "finished" && ((f.homeId === NEWCASTLE_ID && f.awayId === SUNDERLAND_ID) || (f.homeId === SUNDERLAND_ID && f.awayId === NEWCASTLE_ID)))
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const nextDerby = [...s.fixtures, ...s.cupFixtures]
    .filter((f) => f.status === "scheduled" && ((f.homeId === NEWCASTLE_ID && f.awayId === SUNDERLAND_ID) || (f.homeId === SUNDERLAND_ID && f.awayId === NEWCASTLE_ID)))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];

  const toonLine = !nLast
    ? null
    : nLast.r === "W"
      ? nLast.ga === 0
        ? "Clean sheet and all. Lovely."
        : "Three points. Nobody died. Howay."
      : nLast.r === "D"
        ? "A point. Could be worse. Could be a Mackem."
        : "Meanwhile, wor lot are doing what wor lot do best. Making life difficult for ourselves.";

  const [sunLead, ...sunRest] = sunNews;

  return (
    <div className="mx-auto max-w-6xl px-4">
      {live.fixtures.length > 0 && (
        <section className="pt-6">
          <LiveScoreboards initial={live} />
        </section>
      )}

      {/* 1. The headline */}
      <section className="pb-10 pt-12 sm:pt-20">
        {head ? (
          <>
            <h1 className="tabloid max-w-4xl text-[clamp(3.4rem,12vw,8rem)] drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">{head.main}</h1>
            <p className="serif mt-4 max-w-2xl text-xl leading-snug text-mist drop-shadow-[0_1px_6px_rgba(0,0,0,.8)] sm:text-2xl">{head.sub}</p>
          </>
        ) : (
          <>
            <h1 className="tabloid max-w-4xl text-[clamp(3.4rem,12vw,8rem)]">Howay.</h1>
            <p className="serif mt-4 max-w-2xl text-xl text-mist">Scores are on their way. Give it a minute.</p>
          </>
        )}
      </section>

      {!nufc || !safc ? (
        <NotConnected />
      ) : (
        <div className="grid gap-12">
          {/* 2. Misery meter + 3. Wearside news */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {meter && <MeterCompact m={meter} />}
            <section className="min-w-0">
              <SectionTitle title="Latest from the Wear" href="/news?club=sunderland" link="All of it" mackem />
              {sunLead ? (
                <div className="grid gap-5">
                  <LeadStory a={sunLead} />
                  {sunRest.length > 0 && <div className="grid gap-5 sm:grid-cols-2">{sunRest.slice(0, 2).map((a) => <StoryCard key={a.id} a={a} />)}</div>}
                </div>
              ) : (
                <p className="panel p-5 text-mist">Quiet on the Wear today. Suspiciously quiet. Stories land every afternoon.</p>
              )}
            </section>
          </div>

          {/* 4. The Toon */}
          <section>
            <SectionTitle title="The Toon" href="/newcastle" link="More" />
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="panel panel-top p-5 sm:p-6">
                {nLast && (
                  <>
                    <div className="kicker">Last time out{nLast.comp ? ` · ${nLast.comp}` : ""}</div>
                    <p className="display mt-2 text-4xl">
                      {nLast.home ? `Newcastle ${nLast.gf}-${nLast.ga} ${nLast.opp}` : `${nLast.opp} ${nLast.ga}-${nLast.gf} Newcastle`}
                    </p>
                    <p className="serif mt-2 text-lg text-mist">{toonLine}</p>
                  </>
                )}
                <p className="mt-4 text-mist">
                  {ordinal(nufc.row.position)} in the league on {nufc.row.points} points
                  {nufc.row.position > safc.row.position
                    ? ". Sunderland are above us. We don't want to talk about it."
                    : nufc.row.points > safc.row.points
                      ? `, ${nufc.row.points - safc.row.points} clear of Sunderland. As it should be.`
                      : ", above Sunderland on goal difference. Just."}
                </p>
                {nNext && (
                  <p className="mt-4 border-t border-[var(--line)] pt-4 text-mist">
                    <span className="kicker mr-2">Next</span>
                    {nNext.homeId === NEWCASTLE_ID ? `${name(nNext.awayId)} at home` : `${name(nNext.homeId)} away`} · {when(nNext.kickoff)}
                    {(nNext.leagueId ?? 39) !== 39 && nNext.competition ? ` · ${nNext.competition}` : ""}
                  </p>
                )}
              </div>
              {toonNews.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2">{toonNews.map((a) => <StoryCard key={a.id} a={a} />)}</div>
              ) : (
                <p className="panel p-5 text-mist">Nowt new from St James&apos; today. Enjoy the peace.</p>
              )}
            </div>
          </section>

          {/* 5. Tyne v Wear */}
          <section>
            <SectionTitle title="Tyne v Wear" href="/tyne" link="The derby" />
            <div className="panel grid divide-y divide-[var(--line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-5">
                <div className="kicker">The table</div>
                <p className="display mt-2 text-3xl">
                  Newcastle {ordinal(nufc.row.position)} <span className="text-silver">·</span> <span className="text-mackem">Sunderland {ordinal(safc.row.position)}</span>
                </p>
                <p className="mt-2 text-sm text-mist">
                  {nufc.row.points === safc.row.points
                    ? "Level on points. Unacceptable."
                    : nufc.row.points > safc.row.points
                      ? `${nufc.row.points - safc.row.points} point${nufc.row.points - safc.row.points === 1 ? "" : "s"} between us. Not enough, never enough.`
                      : `They're ${safc.row.points - nufc.row.points} ahead. It won't last.`}
                </p>
              </div>
              <div className="p-5">
                <div className="kicker">Last derby</div>
                {derbies[0] ? (
                  <>
                    <p className="display mt-2 text-3xl">
                      {name(derbies[0].homeId)} {derbies[0].homeGoals}-{derbies[0].awayGoals} {name(derbies[0].awayId)}
                    </p>
                    <p className="mt-2 text-sm text-mist">
                      {(derbies[0].homeId === NEWCASTLE_ID ? derbies[0].homeGoals! - derbies[0].awayGoals! : derbies[0].awayGoals! - derbies[0].homeGoals!) > 0
                        ? "Frame it."
                        : "We're not talking about it."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="display mt-2 text-3xl">None yet this season</p>
                    <p className="mt-2 text-sm text-mist">{s.season === 2026 ? "Last season they did the double over us. Next question." : "Plenty of time for them to get battered."}</p>
                  </>
                )}
              </div>
              <div className="p-5">
                <div className="kicker">Next derby</div>
                {nextDerby ? (
                  <>
                    <p className="display mt-2 text-3xl">{nextDerby.homeId === NEWCASTLE_ID ? "St James' Park" : "Stadium of Light"}</p>
                    <p className="mt-2 text-sm text-mist">{when(nextDerby.kickoff)}. Book the day off.</p>
                  </>
                ) : (
                  <>
                    <p className="display mt-2 text-3xl">Not in the fixtures yet</p>
                    <p className="mt-2 text-sm text-mist">We&apos;ll tell you the minute it is.</p>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
