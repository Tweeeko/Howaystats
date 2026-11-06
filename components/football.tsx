/* Football primitives: crests, form, freshness, empty states, fixture tickets. Server-safe. */
import Link from "next/link";
import { EMPTY } from "@/lib/voice";
import type { Club, Fixture, FormResult } from "@/lib/types";

export function Crest({ club, size = 22 }: { club?: Club; size?: number }) {
  if (!club) return <span style={{ width: size, height: size }} className="inline-block bg-slate" />;
  // Provider-supplied crest images are used only to identify clubs in tables/fixtures.
  // eslint-disable-next-line @next/next/no-img-element
  return club.logoUrl ? (
    <img src={club.logoUrl} alt="" width={size} height={size} loading="lazy" className="inline-block shrink-0 object-contain" style={{ width: size, height: size }} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className="inline-grid shrink-0 place-items-center bg-slate font-mono font-bold">
      {club.code}
    </span>
  );
}

export function Form({ form, size = "sm" }: { form: FormResult[]; size?: "sm" | "lg" }) {
  if (!form.length) return null;
  return (
    <span className="inline-flex gap-[3px]" aria-label={`Form: ${form.join(" ")}`}>
      {form.map((r, i) => (
        <span key={i} className={`form-pip ${r} ${size === "lg" ? "!h-7 !w-7 !text-sm" : ""}`}>
          {r}
        </span>
      ))}
    </span>
  );
}

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" });
const fmtTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
export const ukDateTime = (iso: string) => fmt.format(new Date(iso));
export const ukDay = (iso: string) => fmtDay.format(new Date(iso));
export const ukTime = (iso: string) => fmtTime.format(new Date(iso));

export function ago(iso: string | null) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)} days ago`;
}


export function NotConnected({ what = "football data" }: { what?: string }) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      <p className="display text-3xl">{what === "football data" ? EMPTY.footballTitle : `No ${what} yet.`}</p>
      <p className="max-w-prose text-sm text-mist">
        {EMPTY.footballBody}
      </p>
    </div>
  );
}

export function statusLabel(f: Fixture) {
  switch (f.status) {
    case "live":
      return f.elapsed ? `${f.elapsed}'` : "LIVE";
    case "halftime":
      return "HT";
    case "finished":
      return f.statusShort === "AET" ? "AET" : f.statusShort === "PEN" ? "PENS" : "FT";
    case "postponed":
      return "POSTPONED";
    case "cancelled":
      return "CANCELLED";
    case "suspended":
      return "SUSPENDED";
    default:
      return ukTime(f.kickoff);
  }
}


