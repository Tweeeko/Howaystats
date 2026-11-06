import type { Metadata } from "next";
import Link from "next/link";
import { getNews } from "@/lib/database/queries";
import { LeadStory, StoryCard } from "@/components/news";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "News",
  description: "Real Sunderland and Newcastle stories, with a Geordie take on each one and a link to whoever wrote it first.",
};

const TABS = [
  { key: undefined, label: "Everything" },
  { key: "sunderland", label: "Wearside" },
  { key: "newcastle", label: "The Toon" },
] as const;

export default async function News({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const { club } = await searchParams;
  const which = club === "sunderland" || club === "newcastle" ? club : undefined;
  const stories = await getNews({ club: which, limit: 30 });
  const [lead, ...rest] = stories;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="tabloid text-[clamp(3.2rem,10vw,6.5rem)]">The news</h1>
      <p className="serif mt-2 max-w-2xl text-lg text-mist">
        Real stories from real papers. We read them so you don&apos;t have to, then tell you what we think. Tap through for the proper version.
      </p>
      <nav className="mt-6 flex gap-1" aria-label="Filter">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/news?club=${t.key}` : "/news"}
            className={`display border px-4 py-2 text-lg ${which === t.key ? "border-chalk bg-chalk text-ink" : "border-[var(--line-strong)] bg-ink/60 text-mist hover:text-chalk"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        {!lead ? (
          <p className="panel p-6 text-mist">
            {which === "newcastle" ? "Nowt from the Toon yet today." : which === "sunderland" ? "Quiet on the Wear. Suspiciously quiet." : "Nothing in yet."} New stories land every afternoon.
          </p>
        ) : (
          <div className="grid gap-5">
            <LeadStory a={lead} />
            {rest.length > 0 && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rest.map((a) => <StoryCard key={a.id} a={a} />)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
