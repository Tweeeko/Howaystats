/**
 * THE TOON. Our side of the page: proud when we're good, honest when we're shite,
 * and always, always above Sunderland in our heads. Mood follows the real table and the odds.
 *
 * mood 4  Europe's calling (top four, or 60%+ chance of Europe)
 * mood 3  dreaming (top seven, or 25%+ chance)
 * mood 2  mid-table, very Newcastle
 * mood 1  bottom half and losing: self-deprecating
 * mood 0  bottom three: don't
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
  next: string | null; // e.g. "Fulham (A), Sat 7 Nov, 15:00"
  aboveSunderlandBy: number | null; // points; null if they're above us
}

export function toonMood(f: ToonFacts): 0 | 1 | 2 | 3 | 4 {
  const n = f.leagueSize;
  const recentLosses = f.form.slice(-3).filter((r) => r === "L").length;
  if (f.position > n - 3) return 0;
  if ((f.played >= 5 && f.position <= 4) || (f.pEurope ?? 0) >= 0.6) return 4;
  if (f.position <= 7 || (f.pEurope ?? 0) >= 0.25) return 3;
  if (f.position > n / 2 && (f.lastResult?.r === "L" || recentLosses >= 2)) return 1;
  return 2;
}

export function toonCopy(f: ToonFacts) {
  const mood = toonMood(f);
  const pos = ord(f.position);
  const head = [
    "Don't. Just don't.",
    `${pos[0].toUpperCase()}${pos.slice(1)}. Shite, frankly.`,
    `Wor lot. ${pos}. Very Newcastle.`,
    "Keep the passport handy",
    "Europe's calling",
  ][mood];
  const sub = [
    "Bottom three. We'll talk about it when we're ready. We're not ready.",
    "Doing what wor lot do best: making life difficult for wersels.",
    "Not great, not terrible. The Gallowgate's seen worse. Usually last Tuesday.",
    "Still in it. Don't get carried away. We're not Sunderland.",
    "Dig the passports out, lads. Somebody check the bairn's is still in date.",
  ][mood];
  const marquee = mood >= 3 ? "Howay the lads" : mood === 2 ? null : null;
  const stamp = f.pEurope === undefined ? "Pending" : f.pEurope >= 0.6 ? "Approved" : f.pEurope >= 0.25 ? "Pending" : "Denied";
  return { mood, head, sub, marquee, stamp };
}

/** St James' Park with a face. Original cartoon, no badge. */
export function StJamesFace({ mood, caption }: { mood: number; caption: string }) {
  const happy = mood >= 3;
  const meh = mood === 2;
  return (
    <figure className="w-full max-w-[520px]">
      <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label={happy ? "St James' Park, buzzing" : meh ? "St James' Park, shrugging" : "St James' Park, head in hands"}>
        {/* the big cantilever stand on the left, smaller stand on the right */}
        <path d="M40 70 L230 70 L230 92 L40 104 Z" fill="#d5d9de" />
        <path d="M230 98 L360 98 L360 112 L230 118 Z" fill="#a7aeb7" />
        <path d="M44 104 L230 92 L230 118 L360 112 L350 232 Q200 256 50 232 Z" fill="#111214" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <rect key={i} x={58 + i * 30} y="112" width="14" height="118" fill="#f4f4f0" opacity=".9" />
        ))}
        <path d="M50 232 Q200 256 350 232 L350 246 Q200 272 50 246 Z" fill="#2e8b4f" />

        <g className={happy ? "wobble" : ""} style={{ transformOrigin: "200px 170px" }}>
          {/* face plate so the features read over the stripes */}
          <ellipse cx="200" cy="168" rx="104" ry="58" fill="#111214" opacity=".88" />
          {happy ? (
            <>
              <path d="M146 154 l6 -12 l6 12 l13 2 l-10 8 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -8 z" fill="#ffd34d" />
              <path d="M242 154 l6 -12 l6 12 l13 2 l-10 8 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -8 z" fill="#ffd34d" />
              <path d="M160 186 Q200 222 240 186 Z" fill="#f4f4f0" />
            </>
          ) : meh ? (
            <>
              <path d="M146 158 L170 158" stroke="#f4f4f0" strokeWidth="7" strokeLinecap="round" />
              <path d="M230 158 L254 158" stroke="#f4f4f0" strokeWidth="7" strokeLinecap="round" />
              <path d="M178 196 Q200 190 222 198" fill="none" stroke="#f4f4f0" strokeWidth="6" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* facepalm */}
              <path d="M144 160 Q156 152 168 160" fill="none" stroke="#f4f4f0" strokeWidth="6" strokeLinecap="round" />
              <path d="M232 160 Q244 152 256 160" fill="none" stroke="#f4f4f0" strokeWidth="6" strokeLinecap="round" />
              <path d="M176 200 L224 200" stroke="#f4f4f0" strokeWidth="6" strokeLinecap="round" />
              <path d="M120 140 Q140 118 178 128 L184 156 Q150 150 128 168 Z" fill="#f2c9a5" stroke="#111214" strokeWidth="3" />
              <circle cx="276" cy="134" r="7" fill="#7cc8ff" />
            </>
          )}
        </g>

        <g transform="translate(286 44)">
          <rect x="-6" y="-26" width="100" height="40" rx="8" fill="#f4f4f0" />
          <path d="M6 14 L-2 30 L20 14 Z" fill="#f4f4f0" />
          <text x="44" y="2" textAnchor="middle" fontSize="21" fontWeight="900" fontStyle="italic" fill="#111214" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">
            {happy ? "HOWAY!" : meh ? "meh." : "ffs."}
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center font-mono text-xs font-bold uppercase tracking-wider text-chalk/80">{caption}</figcaption>
    </figure>
  );
}

/** The European away-days passport. Stamped from the real odds. */
export function Passport({ stamp, pEurope }: { stamp: string; pEurope?: number }) {
  const ink = stamp === "Approved" ? "#2e8b4f" : stamp === "Denied" ? "#e0161f" : "#b8860b";
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
    </div>
  );
}

/** Black-and-white bobble hats. Cheering or groaning with the mood. */
export function ToonFans({ mood, count = 9 }: { mood: number; count?: number }) {
  const cheer = mood >= 3;
  const groan = mood <= 1;
  return (
    <div className="flex items-end justify-center overflow-hidden" role="img" aria-label={cheer ? "Toon fans celebrating" : groan ? "Toon fans with their heads in their hands" : "Toon fans, unmoved"}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 80 120" className={`w-[11%] min-w-[44px] max-w-[84px] ${cheer ? "wobble" : ""}`} style={{ animationDelay: `${(i * 0.21).toFixed(2)}s`, marginBottom: `${((i * 13) % 3) * 4}px` }} aria-hidden="true">
          {cheer && (
            <>
              <path d="M18 92 L6 50" stroke={["#f2c9a5", "#d9a47f", "#a8714f", "#f5d5b8"][i % 4]} strokeWidth="8" strokeLinecap="round" />
              <path d="M62 92 L74 50" stroke={["#f2c9a5", "#d9a47f", "#a8714f", "#f5d5b8"][i % 4]} strokeWidth="8" strokeLinecap="round" />
            </>
          )}
          <path d="M10 120 Q12 86 40 84 Q68 86 70 120 Z" fill="#f4f4f0" />
          {[16, 28, 40, 52, 64].map((x, k) => <rect key={x} x={x - 4} y="88" width="6" height="32" fill={k % 2 ? "#f4f4f0" : "#111214"} />)}
          <circle cx="40" cy="60" r="22" fill={["#f2c9a5", "#d9a47f", "#a8714f", "#f5d5b8", "#c58c66"][i % 5]} />
          <path d="M18 54 Q40 24 62 54 Z" fill="#111214" />
          <rect x="18" y="50" width="44" height="7" rx="3" fill="#f4f4f0" />
          <circle cx="40" cy="30" r="6" fill="#f4f4f0" />
          {cheer ? (
            <>
              <path d="M28 62 Q32 58 36 62" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M44 62 Q48 58 52 62" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="40" cy="72" rx="7" ry="6" fill="#111214" />
            </>
          ) : groan ? (
            <>
              <path d="M28 62 L36 62 M44 62 L52 62" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M33 74 Q40 70 47 74" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
              {i % 2 === 0 && <path d="M18 70 Q24 50 40 46 Q56 50 62 70" fill="none" stroke={["#f2c9a5", "#d9a47f", "#a8714f", "#f5d5b8"][i % 4]} strokeWidth="7" strokeLinecap="round" />}
            </>
          ) : (
            <>
              <circle cx="32" cy="62" r="2.5" fill="#111214" />
              <circle cx="48" cy="62" r="2.5" fill="#111214" />
              <path d="M34 74 L46 74" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      ))}
    </div>
  );
}

/** The Toon hero: our mood, our numbers, the passport, the ground, the fans. */
export function ToonHype({ f }: { f: ToonFacts }) {
  const c = toonCopy(f);
  const L = f.lastResult;
  return (
    <section className={`relative overflow-hidden ${c.mood >= 3 ? "bg-[radial-gradient(120%_90%_at_50%_0%,rgba(46,139,79,.35),rgba(5,6,7,.94)_65%)]" : "bg-ink/85"}`}>
      {c.marquee && (
        <div className="marquee border-y-4 border-ink bg-chalk py-2" aria-hidden="true">
          <div>
            {[0, 1].map((k) => (
              <span key={k} className="haha text-3xl text-ink sm:text-5xl">
                {Array.from({ length: 5 }, () => c.marquee).join(" · ")} ·&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="stripes h-3" />
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-chalk/80">The Toon · {ord(f.position)} · {f.points} pts</p>
          <h1 className="tabloid mt-3 text-[clamp(2.8rem,11vw,6rem)] text-chalk drop-shadow-[0_6px_0_rgba(0,0,0,.55)]">{c.head}</h1>
          <p className="serif mt-4 max-w-xl text-xl leading-snug text-chalk/90">{c.sub}</p>

          {f.aboveSunderlandBy !== null && (
            <p className="mt-6 inline-block bg-chalk px-4 py-2 text-ink">
              <span className="tabloid text-3xl sm:text-4xl">{f.aboveSunderlandBy > 0 ? `Still ${f.aboveSunderlandBy} points above Sunderland` : "Still above Sunderland"}</span>
              <span className="ml-2 font-mono text-xs uppercase tracking-wider">{c.mood <= 1 ? "small mercies" : "as it should be"}</span>
            </p>
          )}
          {f.aboveSunderlandBy === null && (
            <p className="mt-6 inline-block bg-mackem px-4 py-2 text-chalk">
              <span className="tabloid text-3xl">Sunderland are above us</span>
              <span className="ml-2 font-mono text-xs uppercase tracking-wider">we're not discussing it</span>
            </p>
          )}

          <div className="mt-6 grid gap-2 text-mist">
            {L && (
              <p>
                <span className="font-mono text-xs uppercase tracking-wider text-silver">Last time · </span>
                {L.r === "W" ? `Beat ${L.opp} ${L.gf}-${L.ga}. Howay.` : L.r === "D" ? `${L.gf}-${L.ga} with ${L.opp}. A point's a point.` : `Lost ${L.gf}-${L.ga} to ${L.opp}${L.home ? " at home" : ""}. Bin it.`}
              </p>
            )}
            {f.form.length > 0 && (
              <p className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-silver">Form · </span>
                <span className="inline-flex gap-[3px]">{f.form.map((r, i) => <span key={i} className={`form-pip ${r}`}>{r}</span>)}</span>
              </p>
            )}
            {f.next && (
              <p>
                <span className="font-mono text-xs uppercase tracking-wider text-silver">Next · </span>
                {f.next}
              </p>
            )}
          </div>
        </div>
        <div className="grid items-center gap-6 sm:grid-cols-[1.3fr_1fr] lg:grid-cols-1 xl:grid-cols-[1.3fr_1fr]">
          <StJamesFace mood={c.mood} caption={L ? `St James' Park, after ${L.r === "W" ? "beating" : L.r === "D" ? "drawing with" : "losing to"} ${L.opp}` : "St James' Park"} />
          <Passport stamp={c.stamp} pEurope={f.pEurope} />
        </div>
      </div>
      <div className="px-2">
        <ToonFans mood={c.mood} count={c.mood >= 3 ? 11 : 9} />
      </div>
      <div className="stripes h-3" />
    </section>
  );
}
