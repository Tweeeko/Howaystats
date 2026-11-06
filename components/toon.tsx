import { Crowd, StadiumScene } from "./scenes";
import { Passport } from "./passport";
export { Passport };
/**
 * THE TOON. The mirror image of the Sunderland roast: same size, same noise, pointed the other way.
 * Whatever Newcastle do, it's glorious. A win is obvious, a draw is "unbeaten", a defeat by one
 * is "basically a draw". Every number shown is real; only the spin is biased.
 */
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export interface ToonFacts {
  position: number;
  leagueSize: number;
  points: number;
  played: number;
  form: ("W" | "D" | "L")[]; // oldest first
  pEurope?: number; // top seven, from the model (absent until it has run)
  pTop4?: number;
  lastResult: { r: "W" | "D" | "L"; gf: number; ga: number; opp: string; home: boolean } | null;
  next: string | null;
  aboveSunderlandBy: number | null; // points; null if they're above us
  won: number;
  goalsFor: number;
  sunPoints: number | null;
  sunWon: number | null;
  lastScore?: string | null;
  sunLast?: "W" | "D" | "L" | null; // Sunderland's last result, for how the Toon crowd reacts
}

/** How loud the celebration is (it's always a celebration). */
export function toonMood(f: ToonFacts): 0 | 1 | 2 | 3 | 4 {
  const r = f.lastResult?.r;
  if (r === "W" && (f.position <= 4 || (f.pEurope ?? 0) >= 0.6)) return 4;
  if (r === "W") return 3;
  if (r === "D") return 2;
  if (r === "L" && (f.lastResult!.ga - f.lastResult!.gf) <= 1) return 1;
  return r ? 0 : 2;
}

export function toonCopy(f: ToonFacts) {
  const mood = toonMood(f);
  const L = f.lastResult;
  const above = f.aboveSunderlandBy !== null;
  const head = !L
    ? "Howay the lads"
    : L.r === "W"
      ? "Toon win. Obviously."
      : L.r === "D"
        ? "Unbeaten. Again."
        : L.ga - L.gf <= 1
          ? "Only lost by one"
          : "Character building";
  const sub = !L
    ? "Greatest club in the world. Season starts here."
    : L.r === "W"
      ? `Beat ${L.opp} ${L.gf}-${L.ga}. Best team in the North East, this. Best in the country, probably.`
      : L.r === "D"
        ? `${L.gf}-${L.ga} with ${L.opp}. Didn't lose, did we. Point in the bag.`
        : L.ga - L.gf <= 1
          ? `Got beat ${L.ga}-${L.gf} by ${L.opp}. Basically a draw. And fuck it, still better than them Mackems.`
          : `Got beat by ${L.opp}. Fuck it. Still the biggest club in the North East by a mile, and still better than them Mackems.`;
  const marquee = !L ? "Howay the lads · UTM" : L.r === "W" ? "Howay the lads · UTM" : L.r === "D" ? "Unbeaten · HWTL" : "We go again · Howay the lads";
  const stamp = f.pEurope === undefined ? "Pending" : f.pEurope >= 0.6 ? "Approved" : f.pEurope >= 0.25 ? "Pending" : "Next year";
  const badge = above ? "Top of the North East" : "Temporary blip";
  return { mood, head, sub, marquee, stamp, badge };
}

/** The Toon hero: same size and noise as the Sunderland roast, all glory. */
export function ToonHype({ f, compact = false }: { f: ToonFacts; compact?: boolean }) {
  const c = toonCopy(f);
  const L = f.lastResult;
  const winsLine =
    f.sunWon === null
      ? "Every one a classic."
      : f.sunWon === 0
        ? "Sunderland: none. Just saying."
        : f.won > f.sunWon && f.won % f.sunWon === 0
          ? `${f.won / f.sunWon} times as many as Sunderland.`
          : f.won > f.sunWon
            ? "More than Sunderland. Obviously."
            : "Quality over quantity.";
  const stats = [
    { k: "Position", v: ord(f.position), s: f.aboveSunderlandBy !== null ? `of ${f.leagueSize}. Top of the North East.` : `of ${f.leagueSize}. Climbing.` },
    { k: "Points", v: `${f.points}`, s: f.sunPoints !== null && f.points > f.sunPoints ? `${f.points - f.sunPoints} more than Sunderland.` : "Quality over quantity." },
    { k: "League wins", v: `${f.won}`, s: winsLine },
    f.pEurope !== undefined && f.pEurope >= 0.05
      ? { k: "Chance of Europe", v: `${Math.round(f.pEurope * 100)}%`, s: "Dig the passports out." }
      : f.aboveSunderlandBy !== null
        ? { k: "Points above Sunderland", v: `${f.aboveSunderlandBy}`, s: "The only table that matters." }
        : { k: "Goals scored", v: `${f.goalsFor}`, s: "Entertainers." },
  ];

  return (
    <section className="toon-hype" aria-label="Newcastle, glorified">
      <div className="marquee border-y-4 border-ink bg-chalk py-2" aria-hidden="true">
        <div>
          {[0, 1].map((k) => (
            <span key={k} className="haha text-4xl text-ink sm:text-6xl">
              {Array.from({ length: 5 }, () => c.marquee).join(" · ")} ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-[2] mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:py-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-chalk/80">Breaking news from the Tyne</p>
          <h1 className="tabloid mt-3 text-[clamp(3rem,12.5vw,6.2rem)] text-chalk drop-shadow-[0_6px_0_rgba(0,0,0,.6)]">{c.head}</h1>
          <p className="serif mt-4 max-w-xl text-xl leading-snug text-chalk/90">{c.sub}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
            <span className="stamp wobble bg-ink/40 text-[clamp(1.4rem,6vw,2.8rem)] text-chalk">{c.badge}</span>
            <span className="text-[clamp(3rem,11vw,5.5rem)] leading-none" role="img" aria-label="black and white hearts">🖤🤍</span>
          </div>

          <dl className={`mt-8 grid grid-cols-2 gap-px border-4 border-chalk bg-chalk ${compact ? "" : "sm:grid-cols-4 lg:grid-cols-2"}`}>
            {(compact ? stats.slice(2) : stats).map((x) => (
              <div key={x.k} className="bg-ink p-3 sm:p-4">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-chalk/80 sm:text-[11px]">{x.k}</dt>
                <dd className="tabloid mt-1 text-5xl text-chalk sm:text-6xl">{x.v}</dd>
                <dd className="mt-1 text-xs font-semibold text-chalk sm:text-sm">{x.s}</dd>
              </div>
            ))}
          </dl>

          {f.next && (
            <p className="tabloid mt-7 text-[clamp(1.4rem,4.5vw,2.4rem)] text-chalk">Next: {f.next}. Three points, nee bother. Howay the lads.</p>
          )}
        </div>

        <div className="grid items-center gap-8">
          <StadiumScene club="nufc" result={L?.r ?? null} score={f.lastScore ?? undefined} caption={L ? `St James' Park, after ${L.r === "W" ? "battering" : L.r === "D" ? "drawing with" : "being robbed by"} ${L.opp}` : "St James' Park"} />
          <Passport stamp={c.stamp} pEurope={f.pEurope} />
        </div>
      </div>

      <div className="relative z-[2]">
        <Crowd club="nufc" result={L?.r ?? null} mood={f.sunLast === "L" ? "laugh" : f.sunLast ? "fluke" : "cheer"} />
      </div>

      <div className="marquee rev border-y-4 border-chalk bg-ink py-2" aria-hidden="true">
        <div>
          {[0, 1].map((k) => (
            <span key={k} className="haha outline-text text-4xl sm:text-6xl">
              Black and white army · Toon Army · Wor lads · Black and white army ·&nbsp;
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
