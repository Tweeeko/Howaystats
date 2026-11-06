import { HERO_IMAGE } from "@/lib/site";

/**
 * The St James' Park photograph behind every page.
 *
 * Plain <img> on purpose: it's loaded by the visitor's browser straight from Wikimedia at
 * standard thumbnail widths (960/1280/1920). Non-standard widths (like the old 2560px) are
 * refused by Wikimedia with HTTP 429, and routing it through the Vercel image optimiser
 * meant a server-side fetch that could be rate-limited too. If it still fails, the
 * charcoal .stadium background shows instead.
 */
export function StadiumBackdrop() {
  return (
    <div className="stadium" aria-hidden="true">
      <img
        src={HERO_IMAGE.src}
        srcSet={HERO_IMAGE.srcSet}
        sizes="100vw"
        alt=""
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

export function SectionTitle({ title, sub, href, link, mackem = false, id }: { title: string; sub?: string; href?: string; link?: string; mackem?: boolean; id?: string }) {
  return (
    <div className={`section-title ${mackem ? "mackem" : ""}`} id={id}>
      <h2 className={`display text-3xl sm:text-4xl ${mackem ? "text-chalk" : ""}`}>{title}</h2>
      {sub && <span className="text-sm text-silver">{sub}</span>}
      {href && link && (
        <a href={href} className="display shrink-0 text-base text-silver underline-offset-4 hover:text-chalk hover:underline">
          {link} →
        </a>
      )}
    </div>
  );
}

export function Divider() {
  return <hr className="my-10 border-[var(--line)]" />;
}
