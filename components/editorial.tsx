import Link from "next/link";
import type { Meme, NewsArticle } from "@/lib/database/queries";
import { CATEGORY_LABELS, type NewsCategory } from "@/lib/news/classify";
import { ShareBar } from "./share";
import { ukDateTime } from "./football";

const catLabel = (c: string) => CATEGORY_LABELS[c as NewsCategory] ?? c;

/** Newsroom story: our tabloid headline over the publisher's original, our commentary, their facts, their link. */
export function NewsStory({ a, lead = false }: { a: NewsArticle; lead?: boolean }) {
  const isSun = a.club === "sunderland";
  return (
    <article className={`panel relative flex flex-col ${lead ? "p-6 sm:p-8" : "p-5"} ${isSun ? "panel-top mackem" : "panel-top"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {a.breaking && <span className="ribbon text-xs">Breaking</span>}
        <Link href={`/news?category=${a.category}`} className={`kicker !text-[0.65rem] hover:underline ${isSun ? "!text-mackem" : "!text-chalk"}`}>
          {catLabel(a.category)}
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-wider text-silver">
          {a.source} · {a.publishedAt ? ukDateTime(a.publishedAt) : "date not supplied"}
        </span>
      </div>
      <h3 className={`tabloid ${lead ? "text-5xl sm:text-6xl" : "text-[2rem]"}`}>
        <Link href={`/news/${a.slug}`} className="hover:underline decoration-2 underline-offset-4">
          {a.howayHeadline ?? a.originalHeadline}
        </Link>
      </h3>
      <p className="mt-3 border-l-2 border-iron pl-3 text-sm text-silver">
        <span className="kicker mr-1 !text-[0.6rem]">Original</span>
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {a.originalHeadline}
        </a>
      </p>
      {a.howayCommentary && <p className={`serif mt-3 ${lead ? "text-xl" : "text-[1.02rem]"} leading-snug text-mist`}>{a.howayCommentary}</p>}
      {a.keyFacts.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-mist">
          {a.keyFacts.map((k, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-chalk" />
              {k}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="display text-base underline underline-offset-4">
          Read the full story at {a.source} →
        </a>
        {lead && <ShareBar path={`/news/${a.slug}`} text={a.howayHeadline ?? a.originalHeadline} graphic={`/api/og?type=news&slug=${a.slug}`} trackId={a.id} trackTable="news_articles" />}
      </div>
    </article>
  );
}

/** Meme frame: the media is shown from its source (Reddit/GIPHY/community upload), always attributed. */
export function MemeFrame({ m, featured = false, fromArchive = false }: { m: Meme; featured?: boolean; fromArchive?: boolean }) {
  return (
    <figure className={`panel ${featured ? "panel-top mackem" : ""} flex flex-col`}>
      {featured && (
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
          <span className="display-i text-xl">{fromArchive ? "From the archive" : "Today's meme"}</span>
          <span className="font-mono text-[10px] uppercase text-silver">{fromArchive ? "No new memes today — best previously approved" : `Featured ${m.featuredOn}`}</span>
        </div>
      )}
      <div className="relative flex min-h-48 items-center justify-center bg-black">
        {m.mediaUrl ? (
          // Media remains hosted by the source; we hotlink with attribution as the platform permits.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.mediaUrl} alt={m.title} loading="lazy" className={`w-full object-contain ${featured ? "max-h-[520px]" : "max-h-80"}`} />
        ) : (
          <a href={m.sourceUrl} className="display p-8 text-2xl underline" target="_blank" rel="noopener noreferrer">
            View on source →
          </a>
        )}
        {m.source === "giphy" && <span className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase">Powered by GIPHY</span>}
      </div>
      <figcaption className="flex flex-1 flex-col gap-2 p-4">
        {m.caption && <p className="display text-2xl leading-tight">{m.caption}</p>}
        <p className="text-sm text-mist">{m.title}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-silver">
          {m.source === "community" ? `Community submission${m.submittedBy ? ` by ${m.submittedBy}` : ""}` : (
            <>
              By{" "}
              <a href={m.authorUrl ?? m.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {m.author ?? m.source}
              </a>{" "}
              · <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">original post</a>
            </>
          )}{" "}
          · discovered {ukDateTime(m.discoveredAt)}
        </p>
        <p className="text-[11px] text-silver">{m.licenceNote}</p>
        <div className="mt-auto pt-1">
          <ShareBar path={`/memes#${m.id}`} text={m.caption ?? m.title} graphic={featured ? `/api/og?type=meme&id=${m.id}` : undefined} trackId={m.id} trackTable="memes" />
        </div>
      </figcaption>
    </figure>
  );
}

export function BanterReel({ items }: { items: { id: string; kind: string; text: string; for_date: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-2">
        <span className="ribbon text-sm">Meltdown Generator</span>
        <span className="font-mono text-[10px] uppercase text-silver">Built from today&apos;s real results, table and model</span>
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {items.map((b) => (
          <li key={b.id} className="flex items-start gap-3 px-4 py-3">
            <span className="kicker mt-1 w-24 shrink-0 !text-[0.6rem]">{b.kind.replace("-", " ")}</span>
            <p className="display text-xl leading-tight">{b.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
