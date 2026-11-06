import Image from "next/image";
import { HERO_IMAGE } from "@/lib/site";

/**
 * Fixed full-screen St James' Park backdrop: a real aerial photograph (CC BY-SA, credited in the footer),
 * heavily blurred and darkened, with two floodlight beams. Replace via NEXT_PUBLIC_HERO_IMAGE.
 */
export function StadiumBackdrop() {
  // Site-wide: the same photo, much fainter, so every page sits "in" the stadium.
  return (
    <div className="stadium" aria-hidden="true">
      <Image src={HERO_IMAGE.src} alt="" fill priority sizes="100vw" quality={55} />
      <div className="floodlight l" />
      <div className="floodlight r" />
    </div>
  );
}

export function PitchDivider() {
  return <div className="pitch-divider" role="separator" />;
}

export function StripeBar({ mackem = false }: { mackem?: boolean }) {
  return <div className={`stripe-bar ${mackem ? "mackem" : ""}`} />;
}

export function SectionHead({ title, sub, mackem = false, id }: { title: string; sub?: string; mackem?: boolean; id?: string }) {
  return (
    <div className={`lower-third ${mackem ? "mackem" : ""}`} id={id}>
      <h2 className="tag">{title}</h2>
      {sub && <span className="sub">{sub}</span>}
    </div>
  );
}

/** Hero with the St James' Park aerial, graded for a night match and faded into the page. */
export function HeroPhoto({ children }: { children: React.ReactNode }) {
  return (
    <section className="hero hero-fallback">
      <div className="hero-photo" aria-hidden="true">
        <Image src={HERO_IMAGE.src} alt="" fill priority sizes="100vw" quality={70} />
      </div>
      {children}
    </section>
  );
}
