import type { Metadata } from "next";
import Link from "next/link";
import { getNews } from "@/lib/database/queries";
import { CATEGORY_LABELS } from "@/lib/news/classify";
import { NewsStory } from "@/components/editorial";
import { PitchDivider, SectionHead } from "@/components/stadium";

export const revalidate = 300;
export const metadata: Metadata = { title: "The Mackem Newsroom", description: "Real Sunderland and Newcastle football news, rewritten with a Geordie editorial voice and linked to the original publishers." };

export default async function News({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string }> }) {
  const { category, sort } = await searchParams;
  const valid = category && category in CATEGORY_LABELS ? category : undefined;
  const [stories, shared] = await Promise.all([getNews({ category: valid, limit: 30, sort: sort === "shared" ? "shared" : "latest" }), getNews({ limit: 5, sort: "shared" })]);
  const [lead, ...rest] = stories;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="border-b-4 border-double border-chalk pb-4">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-silver">
          <span>Geordie Edition</span>
          <span>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })}</span>
        </div>
        <h1 className="tabloid mt-2 text-center text-[clamp(3.5rem,11vw,8.5rem)]">The Mackem Newsroom</h1>
        <p className="serif text-center text-lg italic text-mist">All the news that&apos;s fit to laugh at. Real stories, real sources, original commentary.</p>
      </div>
      <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Categories">
        <Link href="/news" className={`display border px-3 py-1 text-base ${!valid ? "border-chalk bg-chalk text-ink" : "border-[var(--line-strong)] text-mist"}`}>All</Link>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <Link key={k} href={`/news?category=${k}`} className={`display border px-3 py-1 text-base ${valid === k ? "border-chalk bg-chalk text-ink" : k.startsWith("newcastle") ? "border-[var(--line-strong)] text-mist" : "border-mackem/50 text-mist"}`}>{v}</Link>
        ))}
        <Link href={`/news?${valid ? `category=${valid}&` : ""}sort=shared`} className="display ml-auto px-3 py-1 text-base text-silver underline">Most shared</Link>
      </nav>
      <PitchDivider />
      {!lead ? (
        <div className="panel seats p-6"><p className="text-mist">Nothing published in this section yet. Stories appear after the daily discovery run finds genuine, sourced news — we never invent it.</p></div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5">
            <NewsStory a={lead} lead />
            <div className="grid gap-5 md:grid-cols-2">{rest.map((a) => <NewsStory key={a.id} a={a} />)}</div>
          </div>
          <aside>
            <SectionHead title="Most Shared" />
            <ol className="space-y-4">
              {shared.map((a, i) => (
                <li key={a.id} className="flex gap-3 border-b border-[var(--line)] pb-3">
                  <span className="scoreboard-num text-3xl text-silver">{i + 1}</span>
                  <Link href={`/news/${a.slug}`} className="display text-xl leading-tight hover:underline">{a.howayHeadline ?? a.originalHeadline}</Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
