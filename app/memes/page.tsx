import type { Metadata } from "next";
import { getDailyMeme, getMemes } from "@/lib/database/queries";
import { MemeFrame } from "@/components/editorial";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "The Terrace",
  description: "The memes doing the rounds about the neighbours, pulled in automatically. Biggest first.",
};

/**
 * No uploads, no search box. The daily job pulls the GIFs with the most traction
 * (trending, highest-ranked, newest) and this page just shows them, biggest first.
 */
export default async function Memes() {
  const [daily, hottest, latest] = await Promise.all([getDailyMeme(), getMemes({ sort: "traction", limit: 12 }), getMemes({ limit: 9 })]);
  const top = daily?.meme ?? hottest[0];
  const rest = hottest.filter((m) => m.id !== top?.id);
  const fresh = latest.filter((m) => m.id !== top?.id && !rest.slice(0, 8).some((r) => r.id === m.id));
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="tabloid text-[clamp(3.2rem,10vw,7rem)]">The Terrace</h1>
      <p className="serif mt-2 max-w-2xl text-xl text-mist">What&apos;s doing the rounds about the neighbours. Pulled in every day, biggest first. You divvent have to lift a finger.</p>

      {!top ? (
        <p className="panel mt-8 p-6 text-mist">The wall&apos;s empty right now. New stuff lands every day.</p>
      ) : (
        <>
          <section className="mt-10">
            <div className="kicker mb-3 !text-mackem">Hottest right now</div>
            <div className="mx-auto max-w-2xl">
              <MemeFrame m={top} featured />
            </div>
          </section>
          {rest.length > 0 && (
            <section className="mt-12">
              <div className="flex items-baseline justify-between border-b-2 border-chalk pb-2">
                <h2 className="display text-3xl sm:text-4xl">Most traction</h2>
                <span className="font-mono text-xs uppercase tracking-wider text-silver">Trending · popular · new</span>
              </div>
              <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
                {rest.slice(0, 8).map((m) => <div key={m.id}><MemeFrame m={m} /></div>)}
              </div>
            </section>
          )}
          {fresh.length > 0 && (
            <section className="mt-12">
              <div className="border-b-2 border-chalk pb-2">
                <h2 className="display text-3xl sm:text-4xl">Just in</h2>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{fresh.slice(0, 6).map((m) => <MemeFrame key={m.id} m={m} />)}</div>
            </section>
          )}
          <p className="mt-10 text-xs text-silver">GIFs via GIPHY, credited to whoever made them. Powered by GIPHY.</p>
        </>
      )}
    </div>
  );
}
