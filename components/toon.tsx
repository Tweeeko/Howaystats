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

/** St James' Park with a face. Original cartoon, no badge. Always happy; the only question is how smug. */
export function StJamesFace({ result, caption }: { result: "W" | "D" | "L" | null; caption: string }) {
  const r = result ?? "W";
  return (
    <figure className="w-full max-w-[540px]">
      <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label={r === "W" ? "St James' Park, buzzing" : r === "D" ? "St James' Park, smug" : "St James' Park in sunglasses, unbothered"}>
        {/* floodlight sparkle */}
        {[60, 340].map((x) => (
          <g key={x}>
            <rect x={x - 3} y="30" width="6" height="70" fill="#3a4048" />
            <rect x={x - 18} y="18" width="36" height="16" rx="3" fill="#d5d9de" />
            <rect x={x - 14} y="21" width="28" height="9" fill="#fff8d6" />
          </g>
        ))}
        {/* the big cantilever stand on the left, smaller stand on the right */}
        <path d="M40 70 L230 70 L230 92 L40 104 Z" fill="#d5d9de" />
        <path d="M230 98 L360 98 L360 112 L230 118 Z" fill="#a7aeb7" />
        <path d="M44 104 L230 92 L230 118 L360 112 L350 232 Q200 256 50 232 Z" fill="#111214" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <rect key={i} x={58 + i * 30} y="112" width="14" height="118" fill="#f4f4f0" opacity=".9" />
        ))}
        <path d="M50 232 Q200 256 350 232 L350 246 Q200 272 50 246 Z" fill="#2e8b4f" />

        <g className="wobble" style={{ transformOrigin: "200px 170px" }}>
          <ellipse cx="200" cy="168" rx="104" ry="58" fill="#111214" opacity=".9" />
          {r === "W" && (
            <>
              <path d="M146 154 l6 -12 l6 12 l13 2 l-10 8 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -8 z" fill="#ffd34d" />
              <path d="M242 154 l6 -12 l6 12 l13 2 l-10 8 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -8 z" fill="#ffd34d" />
              <path d="M160 186 Q200 224 240 186 Z" fill="#f4f4f0" />
            </>
          )}
          {r === "D" && (
            <>
              <path d="M142 160 Q156 150 170 160" fill="none" stroke="#f4f4f0" strokeWidth="6" strokeLinecap="round" />
              <path d="M230 160 Q244 150 258 160" fill="none" stroke="#f4f4f0" strokeWidth="6" strokeLinecap="round" />
              <path d="M170 192 Q205 212 236 186" fill="none" stroke="#f4f4f0" strokeWidth="7" strokeLinecap="round" />
            </>
          )}
          {r === "L" && (
            <>
              {/* sunglasses: unbothered */}
              <path d="M132 146 L268 146" stroke="#f4f4f0" strokeWidth="5" />
              <rect x="134" y="146" width="50" height="26" rx="10" fill="#f4f4f0" />
              <rect x="216" y="146" width="50" height="26" rx="10" fill="#f4f4f0" />
              <rect x="140" y="150" width="38" height="17" rx="7" fill="#111214" />
              <rect x="222" y="150" width="38" height="17" rx="7" fill="#111214" />
              <path d="M150 154 L160 154" stroke="#f4f4f0" strokeWidth="3" strokeLinecap="round" />
              <path d="M232 154 L242 154" stroke="#f4f4f0" strokeWidth="3" strokeLinecap="round" />
              <path d="M168 194 Q204 214 236 190" fill="none" stroke="#f4f4f0" strokeWidth="7" strokeLinecap="round" />
            </>
          )}
        </g>

        <g transform="translate(278 46)">
          <rect x="-6" y="-26" width="112" height="40" rx="8" fill="#f4f4f0" />
          <path d="M6 14 L-2 30 L20 14 Z" fill="#f4f4f0" />
          <text x="50" y="2" textAnchor="middle" fontSize="21" fontWeight="900" fontStyle="italic" fill="#111214" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">
            {r === "W" ? "HOWAY!" : r === "D" ? "unbeaten." : "robbed."}
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center font-mono text-xs font-bold uppercase tracking-wider text-chalk/80">{caption}</figcaption>
    </figure>
  );
}

/** The European away-days passport. Stamped from the real odds. */
export function Passport({ stamp, pEurope }: { stamp: string; pEurope?: number }) {
  const ink = stamp === "Approved" ? "#2e8b4f" : "#b8860b";
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 300 380" className="w-full drop-shadow-[0_18px_24px_rgba(0,0,0,.6)]" role="img" aria-label={`European away days passport, stamped ${stamp}`}>
        <rect x="10" y="10" width="280" height="360" rx="14" fill="#111214" stroke="#3a4048" strokeWidth="3" />
        <rect x="26" y="26" width="248" height="328" rx="8" fill="none" stroke="#f4f4f0" strokeOpacity=".35" strokeWidth="1.5" />
        <text x="150" y="84" textAnchor="middle" fontSize="15" letterSpacing="4" fill="#f4f4f0" fontFamily="ui-monospace, monospace">HOWAYSTATS</text>
        <text x="150" y="122" textAnchor="middle" fontSize="40" fontWeight="900" fill="#f4f4f0" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">PASSPORT</text>
        <text x="150" y="146" textAnchor="middle" fontSize="12" letterSpacing="3" fill="#a7aeb7" fontFamily="ui-monospace, monospace">EUROPEAN AWAY DAYS</text>
        {/* black and white stripes emblem */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={105 + i * 15} y="170" width="15" height="70" fill={i % 2 ? "#111214" : "#f4f4f0"} />
        ))}
        <rect x="105" y="170" width="90" height="70" fill="none" stroke="#f4f4f0" strokeWidth="2" />
        <text x="150" y="292" textAnchor="middle" fontSize="13" fill="#a7aeb7" fontFamily="ui-monospace, monospace">HOLDER: THE TOON ARMY</text>
        {/* the stamp */}
        <g transform="rotate(-14 150 250)" opacity=".92">
          <rect x="52" y="214" width="196" height="70" rx="8" fill="none" stroke={ink} strokeWidth="6" />
          <text x="150" y="262" textAnchor="middle" fontSize="40" fontWeight="900" fill={ink} fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">{stamp.toUpperCase()}</text>
        </g>
      </svg>
      {pEurope !== undefined && (
        <p className="mt-2 text-center font-mono text-xs uppercase tracking-wider text-chalk/80">Chance of Europe: {Math.round(pEurope * 100)}%</p>
      )}
      <p className="mt-1 text-center font-mono text-[11px] uppercase tracking-wider text-chalk/70">Ever seen a Mackem in Milan? Nah. Us? Aye.</p>
    </div>
  );
}

/** Black-and-white bobble hats, arms up, singing. Win, lose or draw. */
export function ToonFans({ count = 9 }: { count?: number }) {
  const skin = ["#f2c9a5", "#d9a47f", "#a8714f", "#f5d5b8", "#c58c66"];
  return (
    <div className="flex items-end justify-center overflow-hidden" role="img" aria-label="Toon fans, arms up, singing">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 80 120" className="wobble w-[11%] min-w-[44px] max-w-[84px]" style={{ animationDelay: `${(i * 0.21).toFixed(2)}s`, marginBottom: `${((i * 13) % 3) * 4}px` }} aria-hidden="true">
          <path d="M18 92 L6 48" stroke={skin[i % 5]} strokeWidth="8" strokeLinecap="round" />
          <path d="M62 92 L74 48" stroke={skin[i % 5]} strokeWidth="8" strokeLinecap="round" />
          {i % 3 === 0 && (
            <g>
              <rect x="0" y="36" width="80" height="10" fill="#111214" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <rect key={k} x={k * 10} y="36" width="5" height="10" fill="#f4f4f0" />)}
            </g>
          )}
          <path d="M10 120 Q12 86 40 84 Q68 86 70 120 Z" fill="#f4f4f0" />
          {[16, 28, 40, 52, 64].map((x, k) => <rect key={x} x={x - 4} y="88" width="6" height="32" fill={k % 2 ? "#f4f4f0" : "#111214"} />)}
          <circle cx="40" cy="60" r="22" fill={skin[i % 5]} />
          <path d="M18 54 Q40 24 62 54 Z" fill="#111214" />
          <rect x="18" y="50" width="44" height="7" rx="3" fill="#f4f4f0" />
          <circle cx="40" cy="30" r="6" fill="#f4f4f0" />
          <path d="M28 62 Q32 58 36 62" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44 62 Q48 58 52 62" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="40" cy="72" rx="7" ry="6" fill="#111214" />
        </svg>
      ))}
    </div>
  );
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

        <div className="grid items-center gap-6 sm:grid-cols-[1.3fr_1fr] lg:grid-cols-1 xl:grid-cols-[1.4fr_1fr]">
          <StJamesFace result={L?.r ?? null} caption={L ? `St James' Park, after ${L.r === "W" ? "battering" : L.r === "D" ? "drawing with" : "being robbed by"} ${L.opp}` : "St James' Park"} />
          <Passport stamp={c.stamp} pEurope={f.pEurope} />
        </div>
      </div>

      <div className="relative z-[2] px-2">
        <ToonFans count={11} />
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
