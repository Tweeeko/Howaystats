import Link from "next/link";
import { getNews, getSnapshot } from "@/lib/database/queries";
import { buildLivePayload } from "@/lib/live";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { clubView, meterView, roastFacts, toonFacts } from "@/lib/view";
import type { Fixture } from "@/lib/types";
import { NotConnected } from "@/components/football";
import { LiveScoreboards } from "@/components/live";
import { TheGap } from "@/components/gap";
import { Roast } from "@/components/roast";
import { ToonHype } from "@/components/toon";
import { Handover } from "@/components/handover";

export const revalidate = 60;

const when = (iso: string) =>
  `${new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" })}, ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;

/**
 * The homepage has one job, in this order:
 * 1. The gap: our points v their points.
 * 2. Laugh at the Mackems (roast, crying stadium, jar of tears, crying fans).
 * 3. Check the Toon are doing wonderful (they always are).
 * 4. A handful of headlines pointing at the News page. That's it.
 */
export default async function Home() {
  const s = await getSnapshot();
  const [sunNews, toonNews, live] = await Promise.all([
    getNews({ club: "sunderland", limit: 3 }),
    getNews({ club: "newcastle", limit: 3 }),
    buildLivePayload(false),
  ]);
  const nufc = clubView(s, NEWCASTLE_ID);
  const safc = clubView(s, SUNDERLAND_ID);
  if (!nufc || !safc) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <NotConnected />
      </div>
    );
  }
  const meter = meterView(s);
  const roast = roastFacts(s);
  const toon = toonFacts(s);
  const isDerby = (f: Fixture) => (f.homeId === NEWCASTLE_ID && f.awayId === SUNDERLAND_ID) || (f.homeId === SUNDERLAND_ID && f.awayId === NEWCASTLE_ID);
  const nextDerby = [...s.fixtures, ...s.cupFixtures].filter((f) => f.status === "scheduled" && isDerby(f)).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  const jar = meter && meter.total
    ? {
        percent: (100 * meter.bad) / meter.total,
        note: meter.bad === meter.total ? `Jar of tears: overflowing (${meter.bad}/${meter.total} bad signs)` : meter.bad === 0 ? "Jar of tears: empty. Annoying." : `Jar of tears: ${meter.bad} of ${meter.total} bad signs`,
      }
    : undefined;

  return (
    <div>
      {live.fixtures.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-6">
          <LiveScoreboards initial={live} />
        </section>
      )}

      {/* 1. The only table that matters */}
      <TheGap
        nufc={{ points: nufc.row.points, position: nufc.row.position, played: nufc.row.played, goalDifference: nufc.row.goalDifference, form: nufc.row.form as ("W" | "D" | "L")[] }}
        sun={{ points: safc.row.points, position: safc.row.position, played: safc.row.played, goalDifference: safc.row.goalDifference, form: safc.row.form as ("W" | "D" | "L")[] }}
        leagueSize={s.table.length}
        nextDerby={nextDerby ? `${nextDerby.homeId === NEWCASTLE_ID ? "St James' Park" : "Stadium of Light"}, ${when(nextDerby.kickoff)}` : null}
      />

      <nav aria-label="On this page" className="grid grid-cols-3 border-b border-white/15 bg-ink/90 text-center">
        <a href="#mackems" className="display py-3 text-sm text-mackem hover:text-chalk sm:text-lg">↓ Laugh at them</a>
        <a href="#toon" className="display border-x border-white/15 py-3 text-sm hover:text-chalk sm:text-lg">↓ Check on us</a>
        <Link href="/news" className="display py-3 text-sm text-silver hover:text-chalk sm:text-lg">News →</Link>
      </nav>

      {/* 2. Laugh at them */}
      <div id="mackems" className="scroll-mt-14">{roast && <Roast f={roast} jar={jar} compact />}</div>
      <div className="bg-[#3a0a0d] px-4 py-5 text-center">
        <Link href="/mackem-watch" className="display inline-block border-2 border-chalk bg-mackem px-5 py-2.5 text-lg text-chalk hover:bg-chalk hover:text-mackem sm:text-xl">
          The full state of them →
        </Link>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-chalk/60">Misery meter · relegation odds · every result</p>
      </div>

      {/* The handover: from them to us */}
      <Handover seed={new Date().toISOString().slice(0, 10)} nufcLast={toon?.lastResult?.r ?? null} />

      {/* 3. Check on us */}
      <div id="toon" className="scroll-mt-14">{toon && <ToonHype f={toon} compact />}</div>
      <div className="bg-ink px-4 py-5 text-center">
        <Link href="/newcastle" className="display inline-block border-2 border-chalk bg-chalk px-5 py-2.5 text-lg text-ink hover:bg-ink hover:text-chalk sm:text-xl">
          Everything Toon →
        </Link>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-chalk/60">Results · fixtures · the road to Europe</p>
      </div>

      {/* 4. Headlines only. The news lives on its own page. */}
      {(sunNews.length > 0 || toonNews.length > 0) && (
        <section className="mx-auto mt-12 max-w-5xl px-4" aria-label="Latest headlines">
          <div className="flex items-baseline justify-between border-b-2 border-chalk pb-2">
            <h2 className="display text-3xl sm:text-4xl">Read all about it</h2>
            <Link href="/news" className="display text-base text-silver hover:text-chalk">All the news →</Link>
          </div>
          <div className="mt-5 grid gap-8 md:grid-cols-2">
            {[
              { title: "From the Wear", items: sunNews, red: true, href: "/news?club=sunderland" },
              { title: "From the Toon", items: toonNews, red: false, href: "/news?club=newcastle" },
            ].map((col) =>
              col.items.length ? (
                <div key={col.title}>
                  <div className={`kicker ${col.red ? "!text-mackem" : "!text-chalk"}`}>{col.title}</div>
                  <ul className="mt-2 divide-y divide-white/10">
                    {col.items.map((a) => (
                      <li key={a.id} className="py-3">
                        <Link href={`/news/${a.slug}`} className="display block text-xl leading-tight hover:underline underline-offset-4 sm:text-2xl">
                          {a.howayHeadline ?? a.originalHeadline}
                        </Link>
                        {a.punchline && <p className="mt-1 text-sm text-mist">{a.punchline}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}
    </div>
  );
}
