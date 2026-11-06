import Link from "next/link";
import type { Meter } from "@/lib/meter";
import type { NewsArticle } from "@/lib/database/queries";
import { StoryImage } from "./story-image";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

/** A programme page: printed paper with a running head and page number. */
export function Page({ no, title, kicker, children, className = "", mackem = false }: { no: string; title: string; kicker?: string; children: React.ReactNode; className?: string; mackem?: boolean }) {
  return (
    <section className={`paper ${className}`}>
      {mackem && <div className="h-2 bg-mackem" />}
      <div className="p-5 sm:p-8">
        <div className="page-head">
          <h2 className="tabloid text-3xl sm:text-4xl">{title}</h2>
          <span className="no shrink-0">{kicker ? `${kicker} · ` : ""}p.{no}</span>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

/** Ticket stub for a single result. */
export function Ticket({
  label,
  home,
  away,
  hg,
  ag,
  when,
  where,
  stub,
  mackem = false,
}: {
  label: string;
  home: string;
  away: string;
  hg: number;
  ag: number;
  when: string;
  where: string;
  stub: string;
  mackem?: boolean;
}) {
  return (
    <div className={`ticket ${mackem ? "mackem" : ""}`}>
      <div className="min-w-0 p-4 sm:p-5">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[.16em]">{label}</div>
        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
          <span className="display min-w-0 break-words text-2xl leading-none sm:text-4xl">{home}</span>
          <span className="scoreboard-num text-3xl sm:text-5xl">{hg}</span>
          <span className="display min-w-0 break-words text-2xl leading-none sm:text-4xl">{away}</span>
          <span className="scoreboard-num text-3xl sm:text-5xl">{ag}</span>
        </div>
        <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#5a5a55]">
          {when} · {where}
        </div>
      </div>
      <div className="stub">
        <span>{stub}</span>
      </div>
    </div>
  );
}

/** The Mackem Misery Meter as the old scoreboard. */
export function Scoreboard({ m, full = false }: { m: Meter; full?: boolean }) {
  const order = [...m.signs].sort((a, b) => Number(b.bad) - Number(a.bad));
  return (
    <section className="board p-5 sm:p-7" aria-label="The Mackem Misery Meter">
      <div className="flex items-baseline justify-between gap-3">
        <span className="led text-xs uppercase tracking-[.3em]">Mackem misery meter</span>
        <span className="led text-sm">
          {m.bad}
          <span className="led-dim">/{m.total}</span>
        </span>
      </div>
      <p className="led mt-3 text-[clamp(2.2rem,8vw,3.6rem)] uppercase leading-none">{m.levelName}</p>
      <div className="bulbs mt-5" style={{ ["--n" as string]: Math.max(1, m.total) }}>
        {order.map((s) => <span key={s.key} className={s.bad ? "on" : ""} title={s.label} />)}
      </div>
      <p className="mt-5 font-serif text-lg leading-snug text-mist">{full ? m.summary : m.verdict}</p>
      <ul className="mt-5 divide-y divide-white/10 border-t border-white/10">
        {(full ? m.signs : m.signs.filter((s) => s.key !== "derby").slice(0, 4)).map((s) => (
          <li key={s.key} className="py-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-xs uppercase tracking-wider text-silver">{s.label}</span>
              {s.key === "form" ? (
                <span className="inline-flex gap-[3px]">{m.form.map((r, i) => <span key={i} className={`form-pip mackem ${r}`}>{r}</span>)}</span>
              ) : (
                <span className={`led text-lg ${s.bad ? "!text-mackem" : ""}`} style={s.bad ? { textShadow: "0 0 10px rgba(224,22,31,.5)" } : undefined}>{s.value}</span>
              )}
            </div>
            {full && <p className="mt-1 text-sm text-mist">{s.line}</p>}
          </li>
        ))}
      </ul>
      {!full && (
        <Link href="/mackem-watch" className="display mt-4 inline-block text-base text-silver underline-offset-4 hover:text-chalk hover:underline">
          Full state of them →
        </Link>
      )}
    </section>
  );
}

/** A bedsheet banner hung off the terrace. */
export function Banner({ chant, note }: { chant: string; note?: string }) {
  return (
    <div className="px-5">
      <div className="banner px-5 py-4 text-center sm:py-5">
        <p className="tabloid text-[clamp(1.6rem,6vw,2.8rem)]">♪ {chant} ♪</p>
        {note && <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#5a5a55]">{note}</p>}
      </div>
    </div>
  );
}

/** A programme advert. Obviously not real, and says so. */
export function Advert({ title, body, small }: { title: string; body: string; small: string }) {
  return (
    <aside className="advert p-5 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[.3em]">Advertisement</div>
      <p className="tabloid mt-2 text-3xl">{title}</p>
      <p className="mt-2 font-serif text-lg">{body}</p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#5a5a55]">{small}</p>
    </aside>
  );
}

/** Programme article: a story laid out like a printed page. */
export function PrintStory({ a, lead = false }: { a: NewsArticle; lead?: boolean }) {
  return (
    <article className={lead ? "" : "border-t border-[#111214]/20 pt-4"}>
      {lead && a.imageUrl && <StoryImage src={a.imageUrl} className="mb-4 aspect-[16/9] grayscale-[.2]" />}
      <h3 className={`tabloid ${lead ? "text-[clamp(2.2rem,7vw,3.6rem)]" : "text-2xl"}`}>
        <Link href={`/news/${a.slug}`} className="hover:underline decoration-2 underline-offset-4">
          {a.howayHeadline ?? a.originalHeadline}
        </Link>
      </h3>
      {a.howayCommentary && <p className={`serif mt-3 ${lead ? "dropcap text-lg" : "text-base"} leading-snug`}>{a.howayCommentary}</p>}
      {lead && a.punchline && <p className="display mt-3 text-xl">{a.punchline}</p>}
      {!lead && a.punchline && <p className="mt-2 text-sm font-semibold">{a.punchline}</p>}
      <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#5a5a55]">
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          The actual story: {a.source}
        </a>
        {a.publishedAt ? ` · ${day(a.publishedAt)}` : ""}
      </p>
    </article>
  );
}

export { day as programmeDay };
