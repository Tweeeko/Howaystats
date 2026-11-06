import Link from "next/link";
import type { Meme, NewsArticle } from "@/lib/database/queries";
import { CATEGORY_LABELS, type NewsCategory } from "@/lib/news/classify";
import { ShareBar } from "./share";
import { ukDateTime } from "./football";

const catLabel = (c: string) => CATEGORY_LABELS[c as NewsCategory] ?? c;

/** Meme frame: the media is shown from its source (Reddit/GIPHY/community upload), always attributed. */
export function MemeFrame({ m, featured = false, fromArchive = false }: { m: Meme; featured?: boolean; fromArchive?: boolean }) {
  return (
    <figure className={`panel ${featured ? "panel-top mackem" : ""} flex flex-col`}>
      {featured && (
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
          <span className="display-i text-xl">{fromArchive ? "From the archive" : "Today's meme"}</span>
          <span className="font-mono text-[10px] uppercase text-silver">{fromArchive ? "From the archive" : `Featured ${m.featuredOn}`}</span>
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

