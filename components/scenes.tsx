/**
 * Illustrated scenes: proper stadiums and proper crowds. Original artwork, no club badges.
 *
 *  - Stadium of Light: the mood is the weather and the ground. Lose and a storm cloud rains
 *    teardrops on it, half the seats are empty and the pitch is waterlogged.
 *  - St James' Park: the big cantilever stand, floodlights, a packed crowd, a mosaic in the
 *    stand and fireworks when we win. Always a good night.
 *  - Crowds: backlit silhouettes. Ours with arms and scarves up; theirs heads down.
 *
 * All randomness is seeded so the server and the browser draw the same picture.
 */

type Result = "W" | "D" | "L";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wm = (dir: string, file: string) => (w: number) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${file}/${w}px-${file}`;

/** Real aerial photographs (Arne Müseler, CC BY-SA 3.0 DE, via Wikimedia Commons). Standard thumb widths only. */
export const GROUNDS = {
  sun: {
    name: "Stadium of Light",
    src: wm("b/b1", "Sunderland_stadium_of_light.jpg"),
    credit: "Stadium of Light by Arne Müseler / arne-mueseler.com, CC BY-SA 3.0 DE",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Sunderland_stadium_of_light.jpg",
  },
  nufc: {
    name: "St James' Park",
    src: wm("a/a2", "Newcastle_st-james-park_stadium.jpg"),
    credit: "St James' Park by Arne Müseler / arne-mueseler.com, CC BY-SA 3.0 DE",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Newcastle_st-james-park_stadium.jpg",
  },
} as const;

/**
 * The real ground, with the mood laid over the top.
 *  Sunderland lose: storm grade, angled rain, lightning. Draw: grey drizzle. Win: overcast, no rain (for once).
 *  Newcastle: floodlit warmth whatever happens, fireworks after a win.
 */
export function StadiumScene({ club, result, score, caption }: { club: "sun" | "nufc"; result: Result | null; score?: string; caption?: string }) {
  const g = GROUNDS[club];
  const sun = club === "sun";
  const r = result ?? "D";
  const rainy = sun && r !== "W";
  const grade = sun
    ? r === "L"
      ? "grayscale(.55) brightness(.55) contrast(1.15) saturate(.8)"
      : r === "D"
        ? "grayscale(.45) brightness(.7) contrast(1.05)"
        : "grayscale(.25) brightness(.85)"
    : "brightness(.92) contrast(1.08) saturate(1.1)";
  const pid = `rain${club}${r}`;
  return (
    <figure className="w-full">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/15 bg-steel shadow-[0_20px_40px_-12px_rgba(0,0,0,.8)]">
        <img
          src={g.src(1280)}
          srcSet={`${g.src(960)} 960w, ${g.src(1280)} 1280w, ${g.src(1920)} 1920w`}
          sizes="(min-width: 1024px) 560px, 100vw"
          alt={`${g.name}, aerial photograph`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: grade }}
        />

        {/* mood grade */}
        <div
          className="absolute inset-0"
          style={{
            background: sun
              ? r === "L"
                ? "linear-gradient(180deg, rgba(8,12,20,.75) 0%, rgba(8,12,20,.25) 45%, rgba(8,12,20,.55) 100%)"
                : "linear-gradient(180deg, rgba(30,36,44,.55) 0%, rgba(30,36,44,.15) 60%, rgba(30,36,44,.35) 100%)"
              : "radial-gradient(80% 60% at 50% 40%, rgba(255,246,201,.18), rgba(5,8,20,.35) 70%), linear-gradient(180deg, rgba(7,13,28,.55), rgba(7,13,28,.1) 50%, rgba(7,13,28,.4))",
          }}
        />

        {/* rain: angled streaks, two layers at different speeds */}
        {rainy && (
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <pattern id={`${pid}a`} width="34" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
                <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 70" dur={r === "L" ? "0.55s" : "0.9s"} repeatCount="indefinite" additive="sum" />
                <line x1="8" y1="0" x2="8" y2={r === "L" ? 22 : 12} stroke="#cfe6ff" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="25" y1="38" x2="25" y2={r === "L" ? 56 : 46} stroke="#cfe6ff" strokeOpacity=".4" strokeWidth="1" strokeLinecap="round" />
              </pattern>
              <pattern id={`${pid}b`} width="52" height="96" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
                <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 96" dur="0.4s" repeatCount="indefinite" additive="sum" />
                <line x1="14" y1="10" x2="14" y2={r === "L" ? 40 : 22} stroke="#e6f2ff" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${pid}a)`} />
            {r === "L" && <rect width="100%" height="100%" fill={`url(#${pid}b)`} />}
          </svg>
        )}
        {sun && r === "L" && <div className="lightning-flash absolute inset-0 bg-white mix-blend-overlay" aria-hidden="true" />}

        {/* fireworks over St James' after a win */}
        {!sun && r === "W" && (
          <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {[
              [130, 80, "#fff8e1"],
              [500, 64, "#ffd34d"],
              [320, 44, "#ffffff"],
            ].map(([x, y, c], i) => (
              <g key={i} className="firework" style={{ animationDelay: `${i * 0.8}s` }}>
                {Array.from({ length: 16 }, (_, k) => {
                  const a = (k / 16) * Math.PI * 2;
                  return <line key={k} x1={(x as number) + Math.cos(a) * 8} y1={(y as number) + Math.sin(a) * 8} x2={(x as number) + Math.cos(a) * 34} y2={(y as number) + Math.sin(a) * 34} stroke={c as string} strokeWidth="2.4" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px rgba(255,220,120,.9))" }} />;
                })}
              </g>
            ))}
          </svg>
        )}

        {/* scoreboard with the real score */}
        {score && (
          <div className="absolute left-3 top-3 rounded border-2 border-[#3a4048] bg-black/85 px-2.5 py-1 font-mono text-sm font-bold text-[#ffb21a] shadow-lg sm:text-base">{score}</div>
        )}
        <div className={`absolute bottom-3 right-3 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${sun ? "bg-mackem text-chalk" : "bg-chalk text-ink"}`}>
          {sun ? (r === "L" ? "Forecast: tears" : r === "D" ? "Forecast: drizzle" : "Forecast: enjoy it while it lasts") : r === "W" ? "Howay the lads" : r === "D" ? "Unbeaten" : "We go again"}
        </div>
      </div>
      {caption && <figcaption className="mt-2 text-center font-mono text-xs font-bold uppercase tracking-wider text-chalk/80">{caption}</figcaption>}
      <p className="mt-1 text-center text-[10px] text-chalk/50">
        Photo: <a href={g.creditUrl} target="_blank" rel="noopener noreferrer" className="underline">{g.credit}</a>
      </p>
    </figure>
  );
}

/** A terrace of backlit fans. Silhouettes, three rows deep. */
export function Crowd({ club, result }: { club: "sun" | "nufc"; result: Result | null }) {
  const sun = club === "sun";
  const rand = rng(sun ? 1879 : 1892);
  const rows = [
    { y: 92, scale: 0.72, color: "#4a525c", n: 26 },
    { y: 118, scale: 0.86, color: "#23272d", n: 22 },
    { y: 150, scale: 1, color: "#07080a", n: 18 },
  ];
  const sad = sun && result !== "W";
  return (
    <svg viewBox="0 0 800 160" className="block w-full" preserveAspectRatio="xMidYMax slice" role="img" aria-label={sad ? "Sunderland fans, heads in hands" : sun ? "Sunderland fans, nervously celebrating" : "Toon fans, arms up, scarves held high"}>
      <defs>
        <linearGradient id={`haze${club}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sun ? "#ff8a8a" : "#fff6c9"} stopOpacity="0" />
          <stop offset=".45" stopColor={sun ? "#ff9a9a" : "#fff6c9"} stopOpacity={sun ? ".22" : ".42"} />
          <stop offset="1" stopColor={sun ? "#ff9a9a" : "#fff6c9"} stopOpacity=".08" />
        </linearGradient>
      </defs>
      <rect width="800" height="160" fill={`url(#haze${club})`} />
      {rows.map((row, ri) =>
        Array.from({ length: row.n }, (_, i) => {
          const s = row.scale * (0.92 + rand() * 0.16);
          const x = (i + 0.5) * (800 / row.n) + (rand() - 0.5) * 16;
          const y = row.y + (rand() - 0.5) * 6;
          const pose = rand();
          const headDrop = sad ? 6 * s : 0;
          const shoulders = `M${x - 22 * s} ${y + 40 * s} Q${x - 22 * s} ${y + 6 * s} ${x} ${y + 4 * s} Q${x + 22 * s} ${y + 6 * s} ${x + 22 * s} ${y + 40 * s} Z`;
          const head = <ellipse cx={x + (sad ? 3 * s : 0)} cy={y - 10 * s + headDrop} rx={10.5 * s} ry={12.5 * s} fill={row.color} />;
          const arms =
            !sad && pose < 0.75 ? (
              <g stroke={row.color} strokeWidth={7 * s} strokeLinecap="round" fill="none">
                <path d={`M${x - 15 * s} ${y + 10 * s} Q${x - 26 * s} ${y - 14 * s} ${x - 22 * s} ${y - 40 * s}`} />
                <path d={`M${x + 15 * s} ${y + 10 * s} Q${x + 26 * s} ${y - 14 * s} ${x + 22 * s} ${y - 40 * s}`} />
              </g>
            ) : sad && pose < 0.6 ? (
              // hands on head
              <g stroke={row.color} strokeWidth={7 * s} strokeLinecap="round" fill="none">
                <path d={`M${x - 16 * s} ${y + 10 * s} Q${x - 26 * s} ${y - 10 * s} ${x - 8 * s} ${y - 20 * s + headDrop}`} />
                <path d={`M${x + 16 * s} ${y + 10 * s} Q${x + 26 * s} ${y - 10 * s} ${x + 8 * s} ${y - 20 * s + headDrop}`} />
              </g>
            ) : null;
          // Scarves: held overhead for us, draped for them.
          const scarf =
            !sad && pose < 0.35 && ri > 0 ? (
              <g>
                <rect x={x - 28 * s} y={y - 50 * s} width={56 * s} height={11 * s} fill="#f4f4f0" />
                {Array.from({ length: 6 }, (_, k) => (
                  <rect key={k} x={x - 28 * s + k * 9.4 * s} y={y - 50 * s} width={4.7 * s} height={11 * s} fill={sun ? "#e0161f" : "#111214"} />
                ))}
              </g>
            ) : sun && ri === 2 && pose > 0.5 ? (
              <g>
                <rect x={x - 12 * s} y={y + 4 * s} width={24 * s} height={6 * s} fill="#e0161f" />
                <rect x={x - 4 * s} y={y + 4 * s} width={5 * s} height={6 * s} fill="#f4f4f0" />
              </g>
            ) : null;
          // Bobble hats on some of them
          const hat =
            rand() < 0.3 ? (
              <g>
                <path d={`M${x - 10 * s + (sad ? 3 * s : 0)} ${y - 14 * s + headDrop} Q${x + (sad ? 3 * s : 0)} ${y - 34 * s + headDrop} ${x + 10 * s + (sad ? 3 * s : 0)} ${y - 14 * s + headDrop} Z`} fill={sun ? "#c8101a" : "#f4f4f0"} opacity={ri === 2 ? 1 : 0.7} />
                <circle cx={x + (sad ? 3 * s : 0)} cy={y - 32 * s + headDrop} r={4 * s} fill={sun ? "#f4f4f0" : "#111214"} opacity={ri === 2 ? 1 : 0.7} />
              </g>
            ) : null;
          return (
            <g key={`${ri}-${i}`} className={!sad && pose < 0.75 ? "bounce" : undefined} style={!sad ? { animationDelay: `${(rand() * 0.8).toFixed(2)}s` } : undefined}>
              {arms}
              <path d={shoulders} fill={row.color} />
              {head}
              {hat}
              {scarf}
            </g>
          );
        }),
      )}
    </svg>
  );
}
