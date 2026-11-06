import Link from "next/link";
import type { NewsArticle } from "@/lib/database/queries";
import { StoryImage } from "./story-image";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }) : null;

/** Our take, in one or two lines: the summary plus the punchline. */
export const take = (a: NewsArticle) => [a.howayCommentary, a.punchline].filter(Boolean).join(" ");

function Byline({ a }: { a: NewsArticle }) {
  const d = day(a.publishedAt);
  return (
    <p className="mt-3 text-xs text-silver">
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-chalk">
        The actual story: {a.source}
      </a>
      {d && <> · {d}</>}
    </p>
  );
}

/** The big one at the top of a news list. */
export function LeadStory({ a }: { a: NewsArticle }) {
  const sun = a.club === "sunderland";
  return (
    <article className={`panel panel-top ${sun ? "mackem" : ""} grid gap-0 ${a.imageUrl ? "md:grid-cols-[1.1fr_1fr]" : ""}`}>
      <StoryImage src={a.imageUrl} className="aspect-[16/10] md:order-2 md:aspect-auto md:h-full" />
      <div className="p-5 sm:p-7">
        <div className={`kicker ${sun ? "!text-mackem" : ""}`}>{sun ? "Wearside" : "The Toon"}</div>
        <h3 className="tabloid mt-2 text-4xl sm:text-5xl">
          <Link href={`/news/${a.slug}`} className="hover:underline decoration-2 underline-offset-4">
            {a.howayHeadline ?? a.originalHeadline}
          </Link>
        </h3>
        {take(a) && <p className="serif mt-4 text-lg leading-snug text-mist">{take(a)}</p>}
        <Byline a={a} />
      </div>
    </article>
  );
}

/** A normal story in a list. */
export function StoryCard({ a }: { a: NewsArticle }) {
  const sun = a.club === "sunderland";
  return (
    <article className={`panel flex flex-col ${sun ? "border-l-2 !border-l-mackem" : "border-l-2 !border-l-chalk"}`}>
      <StoryImage src={a.imageUrl} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="display text-2xl leading-[0.95]">
          <Link href={`/news/${a.slug}`} className="hover:underline underline-offset-4">
            {a.howayHeadline ?? a.originalHeadline}
          </Link>
        </h3>
        {take(a) && <p className="mt-2 line-clamp-4 text-[0.95rem] leading-snug text-mist">{take(a)}</p>}
        <div className="mt-auto">
          <Byline a={a} />
        </div>
      </div>
    </article>
  );
}

/** Full article page body. */
export function Article({ a }: { a: NewsArticle }) {
  const sun = a.club === "sunderland";
  return (
    <article className={`panel panel-top ${sun ? "mackem" : ""}`}>
      <StoryImage src={a.imageUrl} className="aspect-[16/9]" />
      <div className="p-5 sm:p-8">
        <div className={`kicker ${sun ? "!text-mackem" : ""}`}>{sun ? "Wearside" : "The Toon"}</div>
        <h1 className="tabloid mt-2 text-5xl sm:text-6xl">{a.howayHeadline ?? a.originalHeadline}</h1>
        {a.howayCommentary && <p className="serif mt-5 text-xl leading-snug text-mist">{a.howayCommentary}</p>}
        {a.punchline && <p className="display mt-4 text-2xl">{a.punchline}</p>}
        <div className="mt-6 border-t border-[var(--line)] pt-4 text-sm text-mist">
          <div className="kicker mb-1">What actually happened</div>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-chalk">
            {a.originalHeadline}
          </a>{" "}
          <span className="text-silver">({a.source}{day(a.publishedAt) ? `, ${day(a.publishedAt)}` : ""})</span>
        </div>
      </div>
    </article>
  );
}
