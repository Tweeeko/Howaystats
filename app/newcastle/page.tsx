import type { Metadata } from "next";
import { scheduleCatchUp } from "@/lib/catchup";
import { getNews, getSnapshot } from "@/lib/database/queries";
import { NEWCASTLE_ID } from "@/lib/football/provider";
import { clubName, clubView, ordinal, toonFacts } from "@/lib/view";
import { ToonHype } from "@/components/toon";
import { NotConnected } from "@/components/football";
import { StoryCard } from "@/components/news";
import { SectionTitle } from "@/components/stadium";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "The Toon",
  description: "Newcastle United: results, fixtures, the odds on Europe and the news, from people who actually care.",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

export default async function Newcastle() {
  const s = await getSnapshot();
  scheduleCatchUp();
  const c = clubView(s, NEWCASTLE_ID);
  const news = await getNews({ club: "newcastle", limit: 6 });
  if (!c) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="tabloid text-7xl">The Toon</h1>
        <div className="mt-6"><NotConnected /></div>
      </div>
    );
  }
  const name = (id: number) => clubName(s, id);
  const p = c.pred;
  const results = c.fixtures.recent.slice(0, 6);
  const next = c.fixtures.upcoming.slice(0, 5);
  const europe = p ? Math.round(p.pTop7 * 100) : null;
  const top4 = p ? Math.round(p.pTop4 * 100) : null;

  const hype = toonFacts(s);
  return (
    <>
    {hype && <ToonHype f={hype} />}
    <div className="mx-auto max-w-5xl px-4 py-12">

      {europe !== null && top4 !== null && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="panel panel-top p-5 sm:p-6">
            <div className="kicker">Chance of Europe</div>
            <p className="scoreboard-num mt-1 text-7xl">{europe}%</p>
            <p className="mt-2 text-mist">{europe >= 60 ? "Dust off the passports, lads." : europe >= 25 ? "Basically qualified. Book the flights." : "Next year. Definitely next year."}</p>
          </div>
          <div className="panel panel-top p-5 sm:p-6">
            <div className="kicker">Chance of the top four</div>
            <p className="scoreboard-num mt-1 text-7xl">{top4}%</p>
            <p className="mt-2 text-mist">{top4 >= 50 ? "Champions League nights. Wey aye." : top4 >= 15 ? "Well in it. Get the Champions League anthem on." : "Long shot. We'll still sing about it."}</p>
          </div>
          <p className="text-xs text-silver sm:col-span-2">Top seven usually means Europe; a cup win can change that. From simulating the rest of the season {(s.run?.simulations ?? 50_000).toLocaleString("en-GB")} times.</p>
        </section>
      )}

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <SectionTitle title="Results" />
          {results.length ? (
            <ul className="panel divide-y divide-[var(--line)]">
              {results.map((f) => {
                const home = f.homeId === NEWCASTLE_ID;
                const gf = home ? f.homeGoals! : f.awayGoals!;
                const ga = home ? f.awayGoals! : f.homeGoals!;
                const r = gf > ga ? "W" : gf === ga ? "D" : "L";
                return (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`form-pip ${r}`}>{r}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {home ? `v ${name(f.awayId)}` : `at ${name(f.homeId)}`}
                      {(f.leagueId ?? 39) !== 39 && f.competition ? <span className="text-silver"> · {f.competition}</span> : null}
                    </span>
                    <span className="scoreboard-num">{gf}-{ga}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="panel p-5 text-mist">No games yet.</p>
          )}
        </section>
        <section>
          <SectionTitle title="Next up" />
          {next.length ? (
            <ul className="panel divide-y divide-[var(--line)]">
              {next.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate">
                    {f.homeId === NEWCASTLE_ID ? `v ${name(f.awayId)}` : `at ${name(f.homeId)}`}
                    {(f.leagueId ?? 39) !== 39 && f.competition ? <span className="text-silver"> · {f.competition}</span> : null}
                  </span>
                  <span className="text-sm text-silver">{day(f.kickoff)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel p-5 text-mist">Nothing in the diary.</p>
          )}
        </section>
      </div>

      {news.length > 0 && (
        <section className="mt-12">
          <SectionTitle title="Toon news" href="/news?club=newcastle" link="All of it" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{news.map((a) => <StoryCard key={a.id} a={a} />)}</div>
        </section>
      )}
    </div>
    </>
  );
}
