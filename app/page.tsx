import Link from "next/link";
import { getBanter, getDailyMeme, getDerbies, getMemes, getNews, getSeasonHistory, getSnapshot } from "@/lib/database/queries";
import { buildLivePayload } from "@/lib/live";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { backPageHeadline } from "@/lib/headline";
import { voice } from "@/lib/voice";
import { clubName, clubView, freshness, headToHead, miseryView, opponentDifficulty, ordinal, safetyLine, tableMovement, tyneView } from "@/lib/view";
import { countsTowardsTable } from "@/lib/football/standings";
import type { Fixture } from "@/lib/types";
import { StatusStrip } from "@/components/status-strip";
import { LeagueTable } from "@/components/league-table";
import { FixtureTicket, Freshness, NotConnected, ukDay } from "@/components/football";
import { DangerGauge, MiseryIndex } from "@/components/misery";
import { HeroPhoto } from "@/components/stadium";
import { LiveScoreboards } from "@/components/live";
import { DropZone, EuropeanNights, FightPoster, FrontPage, TapeBand, TearDepartment, Terrace, WearsideWoes, Wire } from "@/components/fanzine";

export const revalidate = 60;
const DAY = 86_400_000;

export default async function Home() {
  const s = await getSnapshot();
  const [news, meme, memes, live, banter, derbies, seasons] = await Promise.all([
    getNews({ limit: 8 }),
    getDailyMeme(),
    getMemes({ limit: 5 }),
    buildLivePayload(false),
    getBanter(10),
    getDerbies(NEWCASTLE_ID, SUNDERLAND_ID),
    getSeasonHistory([NEWCASTLE_ID, SUNDERLAND_ID]),
  ]);

  const nufc = clubView(s, NEWCASTLE_ID);
  const safc = clubView(s, SUNDERLAND_ID);
  const misery = miseryView(s);
  const tyne = tyneView(s);
  const name = (id: number) => clubName(s, id);
  const today = new Date();
  const head = backPageHeadline({ fixtures: [...s.fixtures, ...s.cupFixtures], nufc: s.newcastle, safc: s.sunderland, nufcId: NEWCASTLE_ID, safcId: SUNDERLAND_ID, name, leagueSize: s.table.length });
  const h2h = headToHead(derbies.length ? derbies : s.fixtures, NEWCASTLE_ID, SUNDERLAND_ID);
  const res = (c: typeof nufc) => {
    const f = c?.fixtures.recent[0];
    if (!f) return null;
    const home = f.homeId === c!.id;
    const d = (home ? f.homeGoals! - f.awayGoals! : f.awayGoals! - f.homeGoals!);
    return d > 0 ? "W" : d === 0 ? "D" : "L";
  };
  const v = nufc && safc
    ? voice({
        date: today.toISOString().slice(0, 10),
        sunPos: safc.row.position,
        nufcPos: nufc.row.position,
        leagueSize: s.table.length,
        pRel: safc.pred?.pRelegation,
        pEurope: nufc.pred?.pTop7,
        jarPercent: misery?.jar.percent,
        sunLastResult: res(safc) as "W" | "D" | "L" | null,
        nufcLastResult: res(nufc) as "W" | "D" | "L" | null,
      })
    : null;
  const latestBanter = (kinds: string[]) => banter.find((b) => kinds.includes(b.kind))?.text;
  const dateline = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

  // League-only pips for the drop zone
  const pips = safc
    ? Array.from({ length: safc.totalGames }, (_, i) => {
        const league = safc.fixtures.recent.filter((f) => (f.leagueId ?? 39) === 39).reverse();
        const f = league[i];
        if (!f) return null;
        const d = f.homeId === SUNDERLAND_ID ? f.homeGoals! - f.awayGoals! : f.awayGoals! - f.homeGoals!;
        return d > 0 ? "W" : d === 0 ? "D" : "L";
      })
    : [];

  const nextFor = (c: NonNullable<typeof nufc>, n: number) =>
    c.fixtures.upcoming.slice(0, n).map((f: Fixture) => ({ f, opp: name(f.homeId === c.id ? f.awayId : f.homeId), home: f.homeId === c.id, difficulty: (f.leagueId ?? 39) === 39 ? opponentDifficulty(s, f, c.id) : null }));

  // The wire: real results (all competitions) and published stories, newest first.
  const wire = [
    ...[...(nufc?.fixtures.recent ?? []).slice(0, 3), ...(safc?.fixtures.recent ?? []).slice(0, 3)].map((f) => ({
      id: `r${f.id}`,
      at: f.kickoff,
      tag: (f.leagueId ?? 39) === 39 ? "Result" : (f.competition ?? "Cup"),
      text: `${name(f.homeId)} ${f.homeGoals}-${f.awayGoals} ${name(f.awayId)}`,
      href: "/match-centre",
      red: f.homeId === SUNDERLAND_ID || f.awayId === SUNDERLAND_ID,
    })),
    ...news.map((a) => ({ id: a.id, at: a.publishedAt, tag: a.source, text: a.howayHeadline ?? a.originalHeadline, href: `/news/${a.slug}`, red: a.club === "sunderland" })),
  ]
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, 8);

  const sunJustLost = safc?.fixtures.recent[0] && Date.now() - Date.parse(safc.fixtures.recent[0].kickoff) < 3 * DAY && res(safc) === "L";

  return (
    <>
      <StatusStrip s={s} />

      {/* FRONT PAGE */}
      <HeroPhoto>
        <FrontPage
          dateline={dateline}
          headline={head?.main ?? "Welcome to the Tyne. Hope you've brought a towel."}
          sub={head?.sub ?? "Premier League statistics. Geordie perspective. Mackem misery."}
          jar={misery ? { percent: misery.jar.percent, dropped: misery.jar.dropped, capacity: misery.jar.capacity } : undefined}
          nufc={s.newcastle}
          safc={s.sunderland}
          nClub={s.clubs.get(NEWCASTLE_ID)}
          sClub={s.clubs.get(SUNDERLAND_ID)}
          updated={<Freshness {...freshness(s)} />}
        />
      </HeroPhoto>

      {live.fixtures.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="display mb-2 text-lg tracking-[.3em] text-mackem">Live</div>
          <LiveScoreboards initial={live} />
          <Link href="/match-centre" className="mt-2 inline-block text-sm underline underline-offset-4">Match centre</Link>
        </section>
      )}

      {!s.table.length && (
        <div className="mx-auto max-w-6xl px-4 py-8"><NotConnected /></div>
      )}

      {v && <div className="overflow-x-clip py-6"><TapeBand lines={v.bandLines} /></div>}

      {/* TYNE V WEAR */}
      {tyne && v && (
        <FightPoster
          n={{ club: s.clubs.get(NEWCASTLE_ID), row: tyne.n, pred: tyne.pn }}
          s={{ club: s.clubs.get(SUNDERLAND_ID), row: tyne.u, pred: tyne.pu }}
          h2h={{ aWins: h2h.aWins, draws: h2h.draws, bWins: h2h.bWins, played: h2h.games.length }}
          scoreA={tyne.score.scoreA}
          headline={v.rivalryHead}
        />
      )}

      {/* THE MACKEM TEAR DEPARTMENT */}
      {misery && safc && v && (
        <TearDepartment
          title={v.tearDept}
          caption={latestBanter(["misery-report", "headline"]) ?? v.tearCaption}
          jar={{ percent: misery.jar.percent, dropped: misery.jar.dropped, capacity: misery.jar.capacity }}
          reasons={misery.jarReasons}
          pRel={safc.pred?.pRelegation}
          oddsMove={misery.oddsMove}
        >
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <MiseryIndex score={misery.score} label={misery.label} movement={misery.movement} biggest={misery.biggest} spark={misery.spark} parts={misery.parts} />
            {safc.pred && (
              <div className="flex flex-col items-center justify-center">
                <DangerGauge p={safc.pred.pRelegation} level={misery.danger} />
                {sunJustLost && <span className="stamp mt-3 text-chalk">Someone check on Sunderland</span>}
              </div>
            )}
          </div>
        </TearDepartment>
      )}

      {v && <div className="overflow-x-clip py-6"><TapeBand lines={[v.weather.toUpperCase(), "THE TABLE DOESN'T LIE", "ANOTHER WEEK. ANOTHER REASON TO CHECK IT"]} tone="white" reverse /></div>}

      {/* THE TABLE */}
      {s.table.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-6">
            <h2 className="masthead text-[3.6rem] sm:text-[6rem]">The table</h2>
            <p className="serif pb-2 text-lg italic text-mist">Premier League {s.season}/{String(s.season + 1).slice(2)}. It never lies. Sometimes we wish it would.</p>
          </div>
          <div className="mt-4 border-t-4 border-chalk bg-black/60">
            <LeagueTable table={s.table} clubs={s.clubs} movement={tableMovement(s)} showMovement />
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <Link href="/premier-league" className="underline underline-offset-4">Goals, home &amp; away</Link>
            <Link href="/premier-league#projections" className="underline underline-offset-4">Projected final table</Link>
          </div>
        </section>
      )}

      {/* THE DROP ZONE */}
      {safc && v && (
        <DropZone
          headline={v.dropZone}
          table={s.table}
          clubs={s.clubs}
          focusId={SUNDERLAND_ID}
          summary={latestBanter(["misery-report"])}
          stats={[
            { label: "Position", value: ordinal(safc.row.position), red: safc.row.position > s.table.length - 3 },
            { label: "Behind 17th", value: safc.distances ? (safc.distances.toSeventeenth > 0 ? `${safc.distances.toSeventeenth} pts` : "Clear") : "—", red: true },
            { label: safc.distances?.teamAboveId ? `To catch ${name(safc.distances.teamAboveId)}` : "Club above", value: safc.distances ? `${safc.distances.toTeamAbove} pts` : "—" },
            { label: "Projected points", value: safc.pred ? `${Math.round(safc.pred.expectedPoints)}` : "—" },
            { label: "Relegation chance", value: safc.pred ? `${Math.round(safc.pred.pRelegation * 100)}%` : "—", red: true },
            { label: "Games left", value: `${safc.remaining}` },
          ]}
          pips={pips}
          next={nextFor(safc, 5)}
          safety={safetyLine(safc)}
        />
      )}

      {/* EUROPEAN NIGHTS */}
      {nufc && v && (
        <EuropeanNights headline={v.europe} club={s.clubs.get(NEWCASTLE_ID)} row={nufc.row} pred={nufc.pred} next={nextFor(nufc, 4)} line={latestBanter(["celebration", "post-match"])} />
      )}

      {/* WEARSIDE WOES */}
      <WearsideWoes title={v?.woes ?? "Wearside Woes"} stories={news.filter((n) => n.club === "sunderland")} />

      {/* THE TERRACE */}
      <Terrace
        title={v?.terrace ?? "The Terrace"}
        featured={meme?.meme}
        fromArchive={meme?.fromArchive}
        memes={memes.filter((m) => m.id !== meme?.meme.id)}
        original={safc?.pred ? { src: "/api/og?type=relegation", alt: `Sunderland relegation chance ${Math.round(safc.pred.pRelegation * 100)}%`, share: "/mackem-watch" } : undefined}
      />

      {/* THE WIRE */}
      <Wire items={wire} />

      {/* FIXTURES */}
      {(nufc || safc) && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="masthead text-[3rem] sm:text-[5rem]">Coming up</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            {[nufc, safc].map((c) =>
              c ? (
                <div key={c.id} className="min-w-0">
                  <div className={`display mb-2 text-lg ${c.id === SUNDERLAND_ID ? "text-mackem" : "text-chalk"}`}>{c.name}</div>
                  <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                    {[...c.fixtures.recent.slice(0, 2).reverse(), ...c.fixtures.upcoming.slice(0, 3)].map((f) => (
                      <div key={f.id} className="snap-start"><FixtureTicket f={f} clubs={s.clubs} highlight={c.id} difficulty={countsTowardsTable(f) || (f.leagueId ?? 39) !== 39 ? null : opponentDifficulty(s, f, c.id)} /></div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
          <Link href="/match-centre" className="mt-2 inline-block text-sm underline underline-offset-4">Match centre</Link>
        </section>
      )}

      {/* RECORDS */}
      {(seasons.length > 0 || h2h.games.length > 0) && (
        <section className="mx-auto max-w-6xl border-t border-[var(--line)] px-4 py-10">
          <h2 className="display text-3xl">The long view</h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            {seasons.length > 0 && (
              <table className="pl-table">
                <thead><tr><th className="l">Season</th><th>Newcastle</th><th>Sunderland</th></tr></thead>
                <tbody>
                  {[...new Set(seasons.map((r) => r.season))].map((yr) => {
                    const n = seasons.find((r) => r.season === yr && r.club_id === NEWCASTLE_ID);
                    const u = seasons.find((r) => r.season === yr && r.club_id === SUNDERLAND_ID);
                    return <tr key={yr}><td className="l">{yr}/{String(yr + 1).slice(2)}{yr === s.season ? " (now)" : ""}</td><td>{n ? `${ordinal(n.position)} · ${n.points}` : "—"}</td><td className="text-mackem">{u ? `${ordinal(u.position)} · ${u.points}` : "Not in the PL"}</td></tr>;
                  })}
                </tbody>
              </table>
            )}
            {h2h.games.length > 0 && (
              <ul className="divide-y divide-[var(--line)]">
                {h2h.games.slice(0, 6).map((f) => <li key={f.id} className="flex justify-between py-2 text-sm"><span>{name(f.homeId)} {f.homeGoals}-{f.awayGoals} {name(f.awayId)}</span><span className="text-silver">{ukDay(f.kickoff)}</span></li>)}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-silver">Only seasons stored in our database appear here. No made-up history.</p>
        </section>
      )}
    </>
  );
}
