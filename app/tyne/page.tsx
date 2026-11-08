import type { Metadata } from "next";
import { scheduleCatchUp } from "@/lib/catchup";
import { getDerbies, getSnapshot } from "@/lib/database/queries";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { clubName, ordinal } from "@/lib/view";
import { Form, NotConnected } from "@/components/football";
import { SectionTitle } from "@/components/stadium";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "The Derby",
  description: "Tyne v Wear: this season side by side, every derby we've got on record, and four hundred years of not getting on.",
};

/** Big moments, each one checked against a source. The bad ones stay in. */
const MOMENTS = [
  { when: "Dec 1908", score: "Newcastle 1-9 Sunderland", line: "At St James'. Still the biggest win in the fixture's history. We'll get this one out of the way first.", src: "https://en.wikipedia.org/wiki/Tyne%E2%80%93Wear_derby" },
  { when: "May 1990", score: "Newcastle 0-2 Sunderland", line: "Play-off semi, second leg. Billed as the biggest derby ever. Moving on.", src: "https://www.skysports.com/football/news/11096/8629561/top-ten-tyne-wear" },
  { when: "Apr 2006", score: "Sunderland 1-4 Newcastle", line: "At the Stadium of Light. Albert Luque scored. Remember that, because nobody else does.", src: "https://www.90min.com/posts/newcastle-vs-sunderland-complete-head-to-head-record" },
  { when: "Oct 2010", score: "Newcastle 5-1 Sunderland", line: "Halloween. Kevin Nolan hat-trick. The finest afternoon in the history of the Gallowgate.", src: "https://www.newcastleunited.com/en/news/magpies-memorable-derby-day-victories" },
  { when: "2013–15", score: "Six on the bounce for them", line: "Six derby wins in a row for Sunderland. Dark days. Next.", src: "https://www.90min.com/posts/newcastle-vs-sunderland-complete-head-to-head-record" },
  { when: "Jan 2024", score: "Sunderland 0-3 Newcastle", line: "FA Cup, at theirs. A walk in the park, as they say round here.", src: "https://www.newcastleworld.com/sport/football/newcastle-united/premier-league-202526-when-newcastle-united-play-sunderland-5181943" },
  { when: "2025/26", score: "Sunderland 1-0 · Newcastle 1-2", line: "They did the league double. An own goal at theirs, a 90th-minute winner at ours. We're still not over it.", src: "https://www.sportsmole.co.uk/football/sunderland/tyne-wear-derby/result/woltemade-delivers-sunderland-early-christmas-present-in-tense-tyne-wear-derby_587804.html" },
];

export default async function Derby() {
  const s = await getSnapshot();
  scheduleCatchUp();
  const derbies = (await getDerbies(NEWCASTLE_ID, SUNDERLAND_ID)).filter((f) => f.status === "finished" && f.homeGoals !== null);
  const n = s.newcastle;
  const u = s.sunderland;
  const name = (id: number) => clubName(s, id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="tabloid text-[clamp(3.4rem,11vw,7rem)]">Tyne v Wear</h1>
      <p className="serif mt-2 max-w-2xl text-xl text-mist">
        Newcastle on the Tyne, Sunderland on the Wear. Twelve miles apart and four hundred years of not getting on.
      </p>

      {/* This season, side by side */}
      <section className="mt-10">
        <SectionTitle title="This season" />
        {!n || !u ? (
          <NotConnected />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="pl-table min-w-[340px]">
              <thead>
                <tr>
                  <th className="l"></th>
                  <th>Pos</th>
                  <th>Pts</th>
                  <th>GD</th>
                  <th className="hidden sm:table-cell">Form</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { row: n, label: "Newcastle", cls: "is-nufc" },
                  { row: u, label: "Sunderland", cls: "is-safc" },
                ].map(({ row, label, cls }) => (
                  <tr key={label} className={cls}>
                    <td className="l display text-xl">{label}</td>
                    <td className="scoreboard-num">{ordinal(row.position)}</td>
                    <td className="pts">{row.points}</td>
                    <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td className="hidden sm:table-cell"><Form form={row.form} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-mist">
              {n.position < u.position
                ? `Newcastle ${u.position - n.position} place${u.position - n.position === 1 ? "" : "s"} above them. Natural order restored.`
                : "They're above us. Fluke. Normal service soon, Mackems."}
            </p>
          </div>
        )}
      </section>

      {/* Derbies on record */}
      {derbies.length > 0 && (
        <section className="mt-12">
          <SectionTitle title="Derbies on our records" />
          <ul className="panel divide-y divide-[var(--line)]">
            {derbies.slice(0, 10).map((f) => {
              const nufcGoals = f.homeId === NEWCASTLE_ID ? f.homeGoals! : f.awayGoals!;
              const sunGoals = f.homeId === NEWCASTLE_ID ? f.awayGoals! : f.homeGoals!;
              const r = nufcGoals > sunGoals ? "W" : nufcGoals === sunGoals ? "D" : "L";
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`form-pip ${r}`}>{r}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {name(f.homeId)} {f.homeGoals}-{f.awayGoals} {name(f.awayId)}
                  </span>
                  <span className="text-xs text-silver">
                    {new Date(f.kickoff).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-silver">Only the derbies in our own database, which starts when this site did.</p>
        </section>
      )}

      {/* The history */}
      <section className="mt-12">
        <SectionTitle title="How it started" />
        <div className="serif max-w-3xl space-y-4 text-lg leading-relaxed text-mist">
          <p>
            It goes back further than football. In the 1600s Newcastle had the coal trade sewn up, and Wearside merchants weren&apos;t happy about it. When the Civil
            War kicked off, Newcastle backed the King and Sunderland went with Parliament.{" "}
            <a className="text-sm text-silver underline" href="https://southshieldslocalhistorygroup.co.uk/?p=10011" target="_blank" rel="noopener noreferrer">
              South Shields Local History Group
            </a>
          </p>
          <p>
            Then came the shipyards, both rivers building ships for half the world. That&apos;s probably where &ldquo;Mackem&rdquo; comes from: &ldquo;mak&apos;em and
            tak&apos;em&rdquo;. Probably. Even Sunderland&apos;s own paper says nobody&apos;s completely sure. The phrase was in the Echo by 1953; the word itself caught on in the 70s and 80s.{" "}
            <a className="text-sm text-silver underline" href="https://www.sunderlandecho.com/heritage-and-retro/heritage/where-does-word-mackem-come-two-theories-and-echos-claim-word-explained-1886591" target="_blank" rel="noopener noreferrer">
              Sunderland Echo
            </a>
          </p>
          <p>
            The football started in 1888. Since then it&apos;s been close to level overall, which is the most annoying thing about it.{" "}
            <a className="text-sm text-silver underline" href="https://en.wikipedia.org/wiki/Tyne%E2%80%93Wear_derby" target="_blank" rel="noopener noreferrer">
              Wikipedia
            </a>
          </p>
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title="The ones that matter" />
        <ol className="panel divide-y divide-[var(--line)]">
          {MOMENTS.map((m) => (
            <li key={m.when} className="grid gap-1 px-4 py-4 sm:grid-cols-[90px_1fr] sm:gap-4">
              <span className="font-mono text-sm text-silver">{m.when}</span>
              <div>
                <p className="display text-2xl">{m.score}</p>
                <p className="mt-1 text-mist">
                  {m.line}{" "}
                  <a href={m.src} target="_blank" rel="noopener noreferrer" className="text-xs text-silver underline">
                    source
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
