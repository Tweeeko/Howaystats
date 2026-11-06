import Link from "next/link";
import { getNews, getSnapshot } from "@/lib/database/queries";
import { buildLivePayload } from "@/lib/live";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { backPageHeadline } from "@/lib/headline";
import { clubName, clubView, meterView, ordinal } from "@/lib/view";
import type { Fixture } from "@/lib/types";
import { Form, NotConnected } from "@/components/football";
import { LiveScoreboards } from "@/components/live";
import { Advert, Banner, Page, PrintStory, Scoreboard, Ticket, programmeDay } from "@/components/programme";

export const revalidate = 60;

const kickoff = (iso: string) =>
  `${programmeDay(iso)}, ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;

export default async function Home() {
  const s = await getSnapshot();
  const [sunNews, toonNews, live] = await Promise.all([
    getNews({ club: "sunderland", limit: 4 }),
    getNews({ club: "newcastle", limit: 3 }),
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

  if (!nufc || !safc) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <NotConnected />
      </div>
    );
  }

  const n = s.table.length;
  const nNext = nufc.fixtures.upcoming[0];
  const sLast = safc.fixtures.recent[0];
  const nLast = nufc.fixtures.recent[0];
  const isDerby = (f: Fixture) => (f.homeId === NEWCASTLE_ID && f.awayId === SUNDERLAND_ID) || (f.homeId === SUNDERLAND_ID && f.awayId === NEWCASTLE_ID);
  const all = [...s.fixtures, ...s.cupFixtures];
  const lastDerby = all.filter((f) => f.status === "finished" && isDerby(f)).sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0];
  const nextDerby = all.filter((f) => f.status === "scheduled" && isDerby(f)).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  const issue = nufc.row.played + 1;
  const nextLabel = nNext ? `${nNext.homeId === NEWCASTLE_ID ? name(nNext.awayId) : name(nNext.homeId)} (${nNext.homeId === NEWCASTLE_ID ? "H" : "A"})` : null;

  const res = (f: Fixture, id: number) => {
    const home = f.homeId === id;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    return gf > ga ? "W" : gf === ga ? "D" : "L";
  };
  const sRes = sLast ? res(sLast, SUNDERLAND_ID) : null;
  const nRes = nLast ? res(nLast, NEWCASTLE_ID) : null;

  // Terrace banner: one line, decided by the table.
  const banner =
    safc.row.position === n
      ? { chant: "Rock bottom, rock bottom", note: `Sunderland, ${ordinal(n)} of ${n}` }
      : safc.row.position > n - 3
        ? { chant: "The Championship is calling", note: `Sunderland ${ordinal(safc.row.position)}. Answer the phone, lads.` }
        : nufc.row.position < safc.row.position
          ? { chant: "We're above you, we're above you", note: "(we checked)" }
          : { chant: "We'll be back above you", note: "(any minute now)" };

  const stubFor = sRes === "L" ? "Admit one Mackem · No refunds" : sRes === "W" ? "Souvenir edition · Rare" : "Admit one · Nobody won";

  const toonLine =
    nRes === "W"
      ? "Three points. Nobody died. Howay the lads."
      : nRes === "D"
        ? "A point. Could be worse. Could be a Mackem."
        : "Meanwhile, wor lot are doing what wor lot do best. Making life difficult for wersels.";

  const advert =
    safc.row.position > n - 3
      ? { title: "Wearside Coaches", body: "Tuesday nights in the Championship. Seats available. Loads of them.", small: "Not a real advert. Not a real company. Very real league position." }
      : { title: "Stadium of Light Tours", body: "See where the magic doesn't happen. Kids go free, understandably.", small: "Not a real advert. Please don't ring them." };

  const [sunLead, ...sunRest] = sunNews;

  return (
    <div>
      {live.fixtures.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-6">
          <LiveScoreboards initial={live} />
        </section>
      )}

      {/* COVER */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[11px] font-bold uppercase tracking-[.18em] text-mist">
            <span>The official(ish) matchday programme</span>
            <span>
              Issue {issue}
              {nextLabel ? ` · ${nextLabel}` : ""} · Price: nowt
            </span>
          </div>
          {head && (
            <>
              <h1 className="tabloid mt-8 max-w-4xl text-[clamp(3.6rem,13vw,8.5rem)] drop-shadow-[0_3px_14px_rgba(0,0,0,.75)]">{head.main}</h1>
              <p className="serif mt-4 max-w-2xl text-xl leading-snug text-chalk drop-shadow-[0_2px_8px_rgba(0,0,0,.9)] sm:text-2xl">{head.sub}</p>
            </>
          )}
          <nav aria-label="Inside" className="mt-10 grid grid-cols-2 gap-px border border-white/25 bg-white/25 text-sm sm:grid-cols-4">
            {[
              { p: "2", t: "Result of the week", h: "#result" },
              { p: "3", t: "Notes from the Wear", h: "#wear" },
              { p: "4", t: "Meanwhile, wor lot", h: "#toon" },
              { p: "5", t: "Head to head", h: "#h2h" },
            ].map((c) => (
              <a key={c.p} href={c.h} className="flex items-baseline gap-2 bg-ink/80 px-3 py-2.5 hover:bg-ink">
                <span className="font-mono text-xs text-silver">p.{c.p}</span>
                <span className="display text-base">{c.t}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-12 px-4">
        {/* p.2 Result of the week + scoreboard */}
        <div id="result" className="grid items-start gap-8 md:grid-cols-2">
          <div className="grid gap-8">
            {sLast && (
              <div>
                <div className="kicker mb-3 !text-chalk">p.2 · Result of the week</div>
                <Ticket
                  mackem
                  label={(sLast.leagueId ?? 39) === 39 ? "Premier League" : sLast.competition ?? "Cup"}
                  home={name(sLast.homeId)}
                  away={name(sLast.awayId)}
                  hg={sLast.homeGoals!}
                  ag={sLast.awayGoals!}
                  when={programmeDay(sLast.kickoff)}
                  where={sLast.homeId === SUNDERLAND_ID ? "Stadium of Light" : "Away end"}
                  stub={stubFor}
                />
              </div>
            )}
            <Banner chant={banner.chant} note={banner.note} />
          </div>
          {meter && <Scoreboard m={meter} />}
        </div>

        {/* p.3 Notes from the Wear */}
        <div id="wear">
          <Page no="3" title="Notes from the Wear" kicker="Sunderland" mackem>
            {sunLead ? (
              <div className="grid gap-6">
                <div className="max-w-3xl"><PrintStory a={sunLead} lead /></div>
                {sunRest.length > 0 && <div className="grid gap-5 md:grid-cols-3">{sunRest.slice(0, 3).map((a) => <PrintStory key={a.id} a={a} />)}</div>}
                <Link href="/news?club=sunderland" className="display text-base underline underline-offset-4">More from the Wear →</Link>
              </div>
            ) : (
              <p className="serif text-lg">Quiet on the Wear today. Suspiciously quiet. Stories land every afternoon.</p>
            )}
          </Page>
        </div>

        {/* p.4 Meanwhile, wor lot */}
        <div id="toon" className="grid items-start gap-8 md:grid-cols-[1fr_1.3fr]">
          <div className="grid gap-6">
            {nLast && (
              <div>
                <div className="kicker mb-3 !text-chalk">p.4 · Meanwhile, wor lot</div>
                <Ticket
                  label={(nLast.leagueId ?? 39) === 39 ? "Premier League" : nLast.competition ?? "Cup"}
                  home={name(nLast.homeId)}
                  away={name(nLast.awayId)}
                  hg={nLast.homeGoals!}
                  ag={nLast.awayGoals!}
                  when={programmeDay(nLast.kickoff)}
                  where={nLast.homeId === NEWCASTLE_ID ? "St James' Park" : "Away end"}
                  stub={nRes === "W" ? "Keep this one" : nRes === "D" ? "Admit one · Shrug" : "Bin it"}
                />
              </div>
            )}
            <p className="serif text-xl leading-snug text-chalk drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]">{toonLine}</p>
            <p className="text-mist drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]">
              {ordinal(nufc.row.position)} on {nufc.row.points} points.{" "}
              {nufc.row.position < safc.row.position
                ? nufc.row.points > safc.row.points
                  ? `${nufc.row.points - safc.row.points} clear of Sunderland, which is all that matters.`
                  : "Above Sunderland on goal difference. Just."
                : "Sunderland are above us. We're not discussing it."}
              {nNext ? ` Next: ${nextLabel}, ${kickoff(nNext.kickoff)}.` : ""}
            </p>
          </div>
          <Page no="4" title="Toon news" kicker="Newcastle">
            {toonNews.length ? (
              <div className="grid gap-4">
                {toonNews.map((a, i) => <PrintStory key={a.id} a={a} lead={i === 0} />)}
              </div>
            ) : (
              <p className="serif text-lg">Nowt new from St James&apos; today. Enjoy the peace.</p>
            )}
          </Page>
        </div>

        {/* p.5 Head to head */}
        <div id="h2h" className="grid items-start gap-8 md:grid-cols-[1.5fr_1fr]">
          <Page no="5" title="Head to head" kicker="Tyne v Wear">
            <div className="grid grid-cols-2 gap-px bg-[#111214]">
              {[
                { label: "Newcastle", row: nufc.row, cls: "stripes" },
                { label: "Sunderland", row: safc.row, cls: "stripes-red" },
              ].map((t) => (
                <div key={t.label} className="bg-[var(--paper)]">
                  <div className={`${t.cls} h-3`} />
                  <div className="p-3 sm:p-4">
                    <div className="display text-xl sm:text-3xl">{t.label}</div>
                    <dl className="mt-3 grid gap-1.5 text-sm">
                      <div className="flex justify-between"><dt className="muted">Position</dt><dd className="scoreboard-num">{ordinal(t.row.position)}</dd></div>
                      <div className="flex justify-between"><dt className="muted">Points</dt><dd className="scoreboard-num">{t.row.points}</dd></div>
                      <div className="flex justify-between"><dt className="muted">Goal diff</dt><dd className="scoreboard-num">{t.row.goalDifference > 0 ? `+${t.row.goalDifference}` : t.row.goalDifference}</dd></div>
                    </dl>
                    {t.row.form.length > 0 && <div className="mt-3"><Form form={t.row.form} /></div>}
                  </div>
                </div>
              ))}
            </div>
            <p className="serif mt-4 text-lg">
              {lastDerby
                ? `Last derby: ${name(lastDerby.homeId)} ${lastDerby.homeGoals}-${lastDerby.awayGoals} ${name(lastDerby.awayId)}. ${res(lastDerby, NEWCASTLE_ID) === "W" ? "Frame it." : res(lastDerby, NEWCASTLE_ID) === "D" ? "Nobody's happy." : "We've torn that page out."}`
                : s.season === 2026
                  ? "No derby yet this season. Last season they did the double over us. We've torn that page out."
                  : "No derby yet this season."}
              {nextDerby ? ` Next one: ${nextDerby.homeId === NEWCASTLE_ID ? "St James' Park" : "the Stadium of Light"}, ${kickoff(nextDerby.kickoff)}. Book the day off.` : ""}
            </p>
            <Link href="/tyne" className="display mt-3 inline-block text-base underline underline-offset-4">Four hundred years of not getting on →</Link>
          </Page>
          <Advert {...advert} />
        </div>
      </div>
    </div>
  );
}
