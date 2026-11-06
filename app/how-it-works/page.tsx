import type { Metadata } from "next";
import { getSnapshot } from "@/lib/database/queries";

export const revalidate = 600;
export const metadata: Metadata = { title: "The small print", description: "Where the numbers come from, how the Misery Meter and the odds work, and how we write the news." };

function Q({ q, children, id }: { q: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-[var(--line)] py-6">
      <h2 className="display text-2xl sm:text-3xl">{q}</h2>
      <div className="serif mt-3 space-y-3 text-lg leading-relaxed text-mist">{children}</div>
    </section>
  );
}

export default async function SmallPrint() {
  const s = await getSnapshot();
  const sims = (s.run?.simulations ?? 50_000).toLocaleString("en-GB");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="tabloid text-[clamp(3.2rem,10vw,6rem)]">The small print</h1>
      <p className="serif mt-2 text-xl text-mist">The jokes are biased. The numbers aren&apos;t. Here&apos;s how it all works.</p>

      <div className="mt-8">
        <Q q="Where do the scores come from?">
          <p>football-data.org. Every result, fixture and table on here comes from them, refreshed a few times a day and live while Newcastle or Sunderland are playing. We rebuild the table ourselves using the Premier League&apos;s tie-break rules and check it against theirs.</p>
        </Q>

        <Q q="What's the Mackem Misery Meter?" id="misery">
          <p>A count of bad signs. Each one is either bad for Sunderland or it isn&apos;t, with no weighting and no made-up units:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>they&apos;re in the bottom three</li>
            <li>one win or fewer in their last five</li>
            <li>they&apos;ve conceded two a game or more over the last five</li>
            <li>two or more defeats in a row, or four games without a win</li>
            <li>they lost the last derby</li>
            <li>their last home crowd was under 90% of the Stadium of Light&apos;s 49,000 (only when there&apos;s an official figure)</li>
          </ul>
          <p>If we can&apos;t measure something, it isn&apos;t counted. More red blocks, more misery. That&apos;s it.</p>
        </Q>

        <Q q="And the relegation odds?">
          <p>We rate every team&apos;s attack and defence from this season&apos;s results (and a bit of last season&apos;s), then play the rest of the season {sims} times. Sunderland&apos;s chance of going down is how often they finished in the bottom three. Same idea for Newcastle&apos;s chance of Europe. It&apos;s a decent guess, not a promise. Football&apos;s daft.</p>
        </Q>

        <Q q="How do you write the news?" id="editorial">
          <p>We pull real stories from the BBC, the Guardian and Sky Sports. Each one gets our headline and our take, written only from what the original says, with a link to it. The take is opinion. The facts are theirs.</p>
          <p>Before anything goes up it&apos;s checked: no numbers or names that aren&apos;t in the original, no invented quotes, no copying their headline, no American spellings, no stock robot phrases and no swearing for the sake of it. If it fails, a human looks at it first.</p>
        </Q>

        <Q q="Is this official?">
          <p>Nah. Nowt to do with Newcastle United, Sunderland or the Premier League. It&apos;s a fan site for a laugh. It&apos;s 18+, because there&apos;s swearing. We take the piss out of clubs and results, never ordinary supporters, and never anyone&apos;s injuries or private life.</p>
        </Q>
      </div>
    </div>
  );
}
