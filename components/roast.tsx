/**
 * THE ROAST. The first thing anyone sees, and its volume follows the real table.
 *
 * heat 4  bottom of the league and lost last time: full HAHAHA, tears raining, stadium wailing
 * heat 3  in the bottom three, or lost and in the bottom half: loud
 * heat 2  bottom half: a smirk
 * heat 1  top half but below us: a raised eyebrow
 * heat 0  above us: grudging, one line, no laughing
 *
 * Every number shown is live. The tears are decoration, never a statistic.
 */
import { MackemPassport } from "./mackem-passport";
import { Crowd, StadiumScene } from "./scenes";
import { TearJar } from "./tear-jar";

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export interface RoastFacts {
  position: number;
  leagueSize: number;
  points: number;
  won: number;
  played: number;
  daysSinceWin: number | null;
  lastWinAgainst: string | null;
  lastResult: { r: "W" | "D" | "L"; gf: number; ga: number; opp: string } | null;
  belowUs: boolean;
  gapToUs: number;
  lastScore?: string | null; // e.g. "COV 3 - 1 SUN" for the scoreboard
}

export function roastHeat(f: RoastFacts) {
  const n = f.leagueSize;
  const lost = f.lastResult?.r === "L";
  if (f.position === n && (lost || f.lastResult?.r === "D")) return 4;
  if (f.position > n - 3 || (lost && f.position > n / 2)) return 3;
  if (f.position > n / 2) return 2;
  if (f.belowUs) return 1;
  return 0;
}

export function roastCopy(f: RoastFacts) {
  const heat = roastHeat(f);
  const pos = ord(f.position);
  const big =
    heat === 4
      ? "Sunderland are bottom. HAHAHA"
      : heat === 3
        ? f.position > f.leagueSize - 3
          ? `Sunderland ${pos}. Bottom three. Fucked.`
          : "Sunderland lost again. HAHAHA"
        : heat === 2
          ? `Sunderland ${pos}. Shite, as usual.`
          : heat === 1
            ? `Sunderland ${pos}. Behaving. For now. They'll bottle it.`
            : `Sunderland ${pos}. Above us. Fluke. Don't.`;
  const laugh = heat === 4 ? "HAHAHAHA · SAD MACKEM BASTARDS ·" : heat === 3 ? "HAHAHA · SMB ·" : heat === 2 ? "HAHA" : null;
  const stamp = heat === 4 ? "Rock bottom · SMB" : heat === 3 ? (f.position > f.leagueSize - 3 ? "Going down. Ta-ra" : "Battered") : null;
  return { heat, big, laugh, stamp };
}

export function Roast({ f, jar, compact = false }: { f: RoastFacts; jar?: { percent: number; note: string }; compact?: boolean }) {
  const c = roastCopy(f);
  const tears = Array.from({ length: [0, 0, 6, 14, 24][c.heat] }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    delay: ((i * 0.73) % 6).toFixed(2),
    dur: (5 + ((i * 1.31) % 4)).toFixed(2),
    scale: 0.7 + ((i * 7) % 6) / 10,
  }));
  const loud = c.heat >= 3;
  const L = f.lastResult;
  const stats = [
    { k: "Position", v: ord(f.position), s: loud ? `of ${f.leagueSize}. HAHAHAHA.` : `of ${f.leagueSize}. Shite.` },
    { k: "Points", v: `${f.points}`, s: `from ${f.played} games.${loud ? " Fucking pathetic." : " Meh."}` },
    { k: "League wins", v: `${f.won}`, s: f.won === 0 ? "None. Zero. Nowt. HAHAHA." : f.won === 1 ? "One. Uno. Un. Frame it, lads." : loud ? "Count 'em. Quick job." : "Fluke, most of them." },
    f.daysSinceWin !== null && f.daysSinceWin >= 14
      ? { k: "Days since a league win", v: `${f.daysSinceWin}`, s: f.lastWinAgainst ? `Last one: ${f.lastWinAgainst}. Remember it? Neither do they.` : "And counting. HAHAHA." }
      : { k: f.belowUs ? "Points behind us" : "Points ahead of us", v: `${Math.abs(f.gapToUs)}`, s: f.belowUs ? "Where they belong." : "Temporary. Fluke." },
  ];

  return (
    <section className={c.heat >= 2 ? "roast" : "border-b border-white/15 bg-ink/80"} aria-label="Sunderland, roasted">
      {tears.map((t, i) => (
        <span key={i} className="tear" style={{ left: `${t.left}%`, animationDelay: `${t.delay}s`, animationDuration: `${t.dur}s`, transform: `scale(${t.scale})` }} aria-hidden="true" />
      ))}

      {c.laugh && (
        <div className="marquee border-y-4 border-chalk bg-mackem py-2" aria-hidden="true">
          <div>
            {[0, 1].map((k) => (
              <span key={k} className={`haha text-chalk ${c.heat === 4 ? "text-4xl sm:text-6xl" : "text-3xl sm:text-5xl"}`}>
                {Array.from({ length: 4 }, () => c.laugh).join(" ")}&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={`relative z-[2] mx-auto grid max-w-6xl items-center gap-8 px-4 ${c.heat >= 2 ? "py-8 sm:py-12 lg:grid-cols-[1fr_1fr]" : "py-6"}`}>
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-chalk/80">{c.heat >= 3 ? "Breaking news from Wearside" : "Meanwhile, on the Wear"}</p>
          <h1 className={`tabloid mt-3 text-chalk drop-shadow-[0_6px_0_rgba(0,0,0,.55)] ${c.heat === 4 ? "text-[clamp(3rem,12.5vw,6.2rem)]" : c.heat === 3 ? "text-[clamp(2.6rem,10vw,5.4rem)]" : c.heat === 2 ? "text-[clamp(2.4rem,8vw,5rem)]" : "text-[clamp(1.8rem,5vw,3rem)]"}`}>
            {c.big}
          </h1>

          {c.heat >= 2 && (
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              {c.stamp && (
                <span className="stamp wobble text-[clamp(1.6rem,7vw,3.4rem)] text-chalk">
                  {ord(f.position)} · {c.stamp}
                </span>
              )}
              <span className="text-[clamp(3rem,11vw,5.5rem)] leading-none" role="img" aria-label="laughing">
                {c.heat >= 3 ? "😂😭" : "😏"}
              </span>
            </div>
          )}

          {c.heat >= 2 && (
            <dl className={`mt-8 grid grid-cols-2 gap-px border-4 border-chalk bg-chalk ${compact ? "" : "sm:grid-cols-4 lg:grid-cols-2"}`}>
              {(compact ? stats.slice(2) : stats).map((x) => (
                <div key={x.k} className="bg-blood/95 p-3 sm:p-4">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-chalk/80 sm:text-[11px]">{x.k}</dt>
                  <dd className="tabloid mt-1 text-5xl text-chalk sm:text-6xl">{x.v}</dd>
                  <dd className="mt-1 text-xs font-semibold text-chalk sm:text-sm">{x.s}</dd>
                </div>
              ))}
            </dl>
          )}

          {L && (
            <p className={`tabloid text-chalk ${c.heat >= 3 ? "mt-7 text-[clamp(1.6rem,5vw,2.8rem)]" : "mt-3 text-[clamp(1.2rem,3.5vw,1.8rem)]"}`}>
              {L.r === "L"
                ? `Last game: lost ${L.gf}-${L.ga} to ${L.opp}.${c.heat >= 3 ? " Get in. HAHAHA." : " Lovely."}`
                : L.r === "D"
                  ? `Last game: ${L.gf}-${L.ga} with ${L.opp}. Couldn't even lose properly, useless sods.`
                  : `Last game: beat ${L.opp} ${L.gf}-${L.ga}. ${c.heat >= 2 ? "Enjoy it, lads. It won't last." : "Fluke. Whatever."}`}
            </p>
          )}
          {f.belowUs && f.gapToUs > 0 && c.heat >= 2 && <p className="mt-2 font-serif text-lg text-chalk/90">And they&apos;re {f.gapToUs} points behind us. Sad Mackem bastards.</p>}
        </div>

        {(c.heat >= 2 || jar) && (
          <div className="grid items-center gap-4 sm:grid-cols-[1.6fr_1fr] lg:grid-cols-1">
            {L && c.heat >= 2 ? (
              <StadiumScene club="sun" result={L.r} score={f.lastScore ?? undefined} caption={L.r === "L" ? `The Stadium of Shite, after losing to ${L.opp}` : L.r === "D" ? `The Stadium of Light, after drawing with ${L.opp}. Haway, they said.` : `The Stadium of Light, after beating ${L.opp}. Enjoy it, it won't last.`} />
            ) : (
              <div />
            )}
            {jar && (
              <div className="flex flex-col items-center">
                <TearJar percent={jar.percent} size={240} />
                <p className="mt-1 max-w-[220px] text-center font-mono text-[11px] font-bold uppercase tracking-wider text-chalk/85">{jar.note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative z-[2] mx-auto max-w-6xl px-4 pb-10">
        <p className="mb-3 text-center font-mono text-xs font-bold uppercase tracking-[.3em] text-chalk/80">Their passport. Mind your hands.</p>
        <MackemPassport />
      </div>

      {c.heat >= 2 && (
        <div className="relative z-[2]">
          <Crowd club="sun" result={L?.r ?? null} />
        </div>
      )}

      {c.heat >= 3 && (
        <div className="marquee rev border-y-4 border-chalk bg-ink py-2" aria-hidden="true">
          <div>
            {[0, 1].map((k) => (
              <span key={k} className="haha outline-text text-4xl sm:text-6xl">
                Mackem tears · Haway the lads (they can't even spell it) · Fuck the Mackems · SMB ·&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
