"use client";
import { useEffect, useState } from "react";

interface LiveEvent { minute: number; extra: number | null; team_id: number; player: string | null; type: string; detail: string }
interface LiveFixture {
  id: number;
  status: string;
  statusShort: string;
  elapsed: number | null;
  kickoff: string;
  home: { id: number; name: string; code: string; logo: string | null; goals: number | null };
  away: { id: number; name: string; code: string; logo: string | null; goals: number | null };
  ht: { home: number | null; away: number | null };
  events: LiveEvent[];
  derby: boolean;
}
interface LivePayload { fetchedAt: string; source: "provider-live" | "database"; fixtures: LiveFixture[] }

/**
 * Matchday scoreboard. Polls /api/live (server-cached ~30–60s) only while a tracked match is on.
 * Everything shown comes from the provider; if the feed doesn't supply events, none are shown.
 */
export function LiveScoreboards({ initial }: { initial: LivePayload }) {
  const [data, setData] = useState(initial);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!data.fixtures.length) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/live", { cache: "no-store" });
        if (!r.ok) throw new Error();
        setData(await r.json());
        setErr(false);
      } catch {
        setErr(true);
      }
    }, 45_000);
    return () => clearInterval(id);
  }, [data.fixtures.length]);

  if (!data.fixtures.length) return null;
  return (
    <div className="space-y-4">
      {data.fixtures.map((f) => (
        <Scoreboard key={f.id} f={f} />
      ))}
      <p className="font-mono text-[10px] uppercase tracking-wider text-silver">
        Feed checked {new Date(data.fetchedAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London" })} · {data.source === "provider-live" ? "provider live feed" : "last stored update"}
        {err && <span className="text-mackem"> · couldn&apos;t refresh, showing last known</span>}
      </p>
    </div>
  );
}

const icon = (e: LiveEvent) => (e.type === "Goal" ? (e.detail === "Own Goal" ? "OG" : e.detail === "Penalty" ? "PEN" : "GOAL") : e.type === "Card" ? (e.detail.includes("Red") ? "RED" : "YEL") : e.type === "subst" ? "SUB" : e.type.toUpperCase().slice(0, 3));

export function Scoreboard({ f }: { f: LiveFixture }) {
  const live = f.status === "live" || f.status === "halftime";
  const clock = f.status === "halftime" ? "HT" : f.status === "finished" ? "FT" : f.elapsed ? `${f.elapsed}'` : "KO";
  const goals = f.events.filter((e) => e.type === "Goal" || (e.type === "Card" && e.detail.includes("Red")));
  return (
    <div className={`scoreboard ${f.derby ? "outline outline-2 outline-mackem" : ""}`}>
      {f.derby && <div className="display bg-mackem py-1 text-center text-lg text-chalk">Derby day. Tyne v Wear.</div>}
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider">
        <span className="flex items-center gap-2">{live && <span className="live-dot" />}{live ? "Live" : f.status}</span>
        <span className="led text-base">{clock}</span>
        <span className="text-silver">{f.ht.home !== null ? `HT ${f.ht.home}-${f.ht.away}` : ""}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
        {[f.home, f.away].map((t, i) => (
          <div key={t.id} className={`flex items-center gap-3 ${i === 1 ? "order-3 flex-row-reverse text-right" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t.logo ? <img src={t.logo} alt="" width={40} height={40} className="h-10 w-10 object-contain" /> : <span className="h-10 w-10 bg-slate" />}
            <div>
              <div className="display text-2xl leading-none sm:text-3xl">{t.code}</div>
              <div className="hidden text-xs text-silver sm:block">{t.name}</div>
            </div>
          </div>
        ))}
        <div className="order-2 flex items-center gap-2">
          <span className="led scoreboard-num text-5xl sm:text-6xl">{f.home.goals ?? 0}</span>
          <span className="led text-3xl opacity-60">:</span>
          <span className="led scoreboard-num text-5xl sm:text-6xl">{f.away.goals ?? 0}</span>
        </div>
      </div>
      {goals.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-6 border-t border-[var(--line)] px-4 py-2 font-mono text-xs">
          {goals.map((e, i) => (
            <li key={i} className={`py-0.5 ${e.team_id === f.away.id ? "col-start-2 text-right" : "col-start-1"}`}>
              <span className="text-silver">{e.minute}{e.extra ? `+${e.extra}` : ""}&apos;</span> <span className={icon(e) === "RED" ? "text-mackem" : ""}>{icon(e)}</span> {e.player ?? ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
