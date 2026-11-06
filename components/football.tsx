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
  if (!form.length) return <span className="text-xs text-silver">—</span>;
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

export function Freshness({ latest, isLive, stale, label = "Data" }: { latest: string | null; isLive: boolean; stale: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-silver">
      {isLive ? <span className="live-dot" aria-hidden /> : <span className={`h-2 w-2 ${stale ? "bg-mackem" : "bg-pitch"}`} aria-hidden />}
      {latest ? `${label === "Data" ? "Updated" : `${label} updated`} ${ago(latest)}` : "Waiting for the first data load"}
      {stale && latest && <span className="text-mackem">· out of date</span>}
      {isLive && <span className="text-chalk">· live</span>}
    </span>
  );
}

export function NotConnected({ what = "football data" }: { what?: string }) {
  return (
    <div className="panel seats flex flex-col items-start gap-3 p-6">
      <span className="kicker">Awaiting kick-off</span>
      <p className="display text-3xl">{what === "football data" ? EMPTY.footballTitle : `No ${what} yet.`}</p>
      <p className="max-w-prose text-sm text-mist">
        {EMPTY.footballBody} Admins can kick it off from the <Link className="underline" href="/admin">admin dashboard</Link>.
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

/** Match ticket — fixtures look like the stub you keep in your wallet. */
export function FixtureTicket({ f, clubs, difficulty, highlight }: { f: Fixture; clubs: Map<number, Club>; difficulty?: number | null; highlight?: number }) {
  const h = clubs.get(f.homeId);
  const a = clubs.get(f.awayId);
  const played = f.status === "finished";
  const live = f.status === "live" || f.status === "halftime";
  return (
    <div className="ticket flex min-w-[250px] items-stretch">
      <div className="flex-1 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-iron">
          <span>{ukDay(f.kickoff)}</span>
          {(f.leagueId ?? 39) !== 39 ? (
            <span className="truncate pl-2 font-bold text-blood">{f.competition ?? "Cup"}</span>
          ) : (
            f.round && <span className="truncate pl-2">{f.round.replace("Regular Season - ", "MD ")}</span>
          )}
        </div>
        {[h, a].map((c, i) => (
          <div key={i} className={`flex items-center gap-2 py-0.5 ${highlight && c?.id === highlight ? "font-bold" : ""}`}>
            <Crest club={c} size={18} />
            <span className="display flex-1 truncate text-xl">{c?.shortName ?? "TBC"}</span>
            {(played || live) && <span className="scoreboard-num text-xl">{i === 0 ? f.homeGoals : f.awayGoals}</span>}
          </div>
        ))}
      </div>
      <div className="stub flex w-[74px] flex-col items-center justify-center gap-1 px-2 text-center">
        {live && <span className="live-dot" />}
        <span className={`display text-lg leading-none ${live ? "text-mackem" : ""}`}>{statusLabel(f)}</span>
        {difficulty != null && !played && (
          <span className="flex gap-[2px]" title={`Difficulty ${difficulty}/5`} aria-label={`Difficulty ${difficulty} of 5`}>
            {[1, 2, 3, 4, 5].map((k) => (
              <span key={k} className={`h-2.5 w-1.5 ${k <= difficulty ? (difficulty >= 4 ? "bg-mackem" : "bg-ink") : "bg-ink/15"}`} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "mackem" | "pitch" }) {
  return (
    <div className="border-l-2 border-[var(--line-strong)] pl-3">
      <div className="kicker !text-[0.68rem]">{label}</div>
      <div className={`scoreboard-num text-3xl leading-tight ${tone === "mackem" ? "text-mackem" : tone === "pitch" ? "text-pitch" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-silver">{sub}</div>}
    </div>
  );
}
