import type { Metadata } from "next";
import { getSnapshot } from "@/lib/database/queries";
import { WEIGHTS } from "@/lib/misery/index";
import { ago } from "@/components/football";
import { PitchDivider, SectionHead } from "@/components/stadium";

export const revalidate = 600;
export const metadata: Metadata = { title: "How the numbers work", description: "The HOWAYSTATS method: league table rules, the Poisson team-strength model, 50,000-season Monte Carlo simulation, the Misery Index and the Tear Jar." };

export default async function HowItWorks() {
  const s = await getSnapshot();
  const P = ({ children }: { children: React.ReactNode }) => <p className="serif mt-3 max-w-3xl text-lg leading-relaxed text-mist">{children}</p>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="display-i text-6xl sm:text-8xl">How the numbers work</h1>
      <p className="display mt-3 text-2xl">The comedy is biased. The maths isn&apos;t.</p>
      {s.run && (
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-silver">
          Latest model run {ago(s.run.createdAt)} · {s.run.simulations.toLocaleString("en-GB")} simulated seasons · {s.run.fixturesRemaining} fixtures left · confidence {s.run.confidence} · fitted home advantage ×{Math.exp(s.run.homeAdvantage).toFixed(2)} goals
        </p>
      )}

      <PitchDivider />
      <SectionHead title="1. The Table" />
      <P>Every finished match from the data provider (API-Football) is stored and the table is rebuilt from scratch: 3 points for a win, 1 for a draw, none for a defeat. Clubs are ordered by points, then goal difference, then goals scored, then points in matches between the tied clubs, then away goals in those matches — Premier League rule C.17. Anyone still level is marked with an asterisk (a play-off would settle it if it mattered). Postponed, abandoned and unfinished games don&apos;t count. After each rebuild we check our table against the provider&apos;s own; any mismatch is logged for an admin.</P>

      <SectionHead title="2. Team Strength" />
      <P>Each club gets an attack and a defence rating from a Poisson goals model: expected home goals = exp(base + home advantage + home attack + away defence), and the same without the home term for the away side. Ratings are fitted by penalised maximum likelihood. Recent matches count more (weight halves every 120 days), last season&apos;s matches count at 35% weight, and every rating is pulled gently towards last season&apos;s final rating — or slightly below average for promoted clubs — so a lucky opening fortnight can&apos;t produce nonsense.</P>

      <SectionHead title="3. The 50,000 Seasons" />
      <P>We then play the rest of the season 50,000 times. Every remaining fixture gets random scorelines drawn from the model, starting from the real current points, goal difference and goals. All twenty clubs are simulated together, so each simulated season has exactly one champion and exactly three relegated clubs — the probabilities always add up. A club&apos;s relegation chance is the share of seasons it finished 18th–20th; &ldquo;projected finish&rdquo; is the most common finishing position; the points range covers the middle 80% of outcomes. Ties in simulation are broken by points, goal difference and goals, then at random. With 50,000 runs the simulation error is under ±0.5 percentage points; the bigger uncertainty is the model itself, which is why we show a confidence level that rises as the season goes on.</P>
      <P>Fixture difficulty is the share of available points a club is expected not to win in its remaining games under the same model. Mathematical safety is computed separately and conservatively: the points total no more than sixteen other clubs can still reach.</P>

      <SectionHead id="misery" title="4. The Tear Jar & Misery Index" mackem />
      <P>The Tear Jar is simple on purpose. Every point Sunderland drop goes in: 3 for a defeat, 2 for a draw, nothing for a win. It holds 76 points — the most a club can drop over 38 games and still reach 38 points, the old survival mark. When it&apos;s full, 38 is mathematically gone. It empties every summer. The &ldquo;tears&rdquo; count is the points multiplied by 1,000, which we made up.</P>
      <P>The Misery Index (0–100) is the mood ring. It&apos;s three numbers added together, and we show all three wherever the index appears:</P>
      <div className="panel mt-4 grid gap-1 p-5 font-mono text-sm">
        <p>Relegation odds: 40 × the model&apos;s relegation chance (0–40)</p>
        <p>League position: 20 × (position − 1) ÷ 19 (0–20)</p>
        <p>Recent results: these points, each fading by half every {WEIGHTS.eventHalfLifeDays} days (−20 to +40)</p>
        {[
          ["Defeat", WEIGHTS.loss], ["Extra for losing by 3+", WEIGHTS.heavyLossExtra], ["Draw", WEIGHTS.draw], ["Win", WEIGHTS.win],
          ["Each defeat in a row after the first", WEIGHTS.streakLoss], ["Losing to a bottom-six side", WEIGHTS.sixPointerLoss],
          ["Per place dropped", WEIGHTS.positionDrop], ["Into the bottom three", WEIGHTS.enterZone], ["Out of the bottom three", WEIGHTS.leaveZone],
          ["Newcastle win", WEIGHTS.rivalWin], [`Verified bad-news story (max ${WEIGHTS.newsWeeklyCap} a week)`, WEIGHTS.news],
        ].map(([k, v]) => (
          <p key={k as string} className="flex justify-between border-b border-[var(--line)] py-0.5 text-mist"><span>{k as string}</span><span>{Number(v) > 0 ? "+" : ""}{v as number}</span></p>
        ))}
        <p className="mt-2 text-silver">Each event belongs to one match, and the index is rebuilt from scratch every time, so nothing counts twice. It&apos;s a joke with a spreadsheet behind it, not a claim about how anyone actually feels.</p>
      </div>

      <SectionHead title="5. News, Memes & Banter" />
      <P>News comes from publisher RSS feeds (BBC Sport, The Guardian, Sky Sports) and, if configured, NewsAPI. A story is only used if it is clearly about Sunderland AFC (or Newcastle), and our rewrite is checked automatically: it may not contain any number, name-quote or claim that isn&apos;t in the publisher&apos;s own headline and summary. Stories that fail the check wait for a human. We always show the original headline, the publisher, the date and a link.</P>
      <P>Memes come from GIPHY&apos;s API and Reddit&apos;s official API, shown from their source with credit. Reddit posts and community submissions are moderated before they appear. The banter engine is fed only today&apos;s real table, results, model output and tear-jar level, and any line containing a number we didn&apos;t supply is thrown away.</P>
    </div>
  );
}
