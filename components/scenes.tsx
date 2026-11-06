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

import type React from "react";

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
type Pose = "armsUp" | "scarfUp" | "fist" | "clap" | "point" | "handsOnHead" | "bowed" | "slump" | "armsFolded" | "laugh" | "shrug";
export type CrowdMood = "cry" | "disbelief" | "laugh" | "fluke" | "cheer";
type Top = "shirt" | "jacket";
type Head = "short" | "bald" | "long" | "bobble" | "cap" | "curly";

const SKIN = ["#f1c7a5", "#e8b894", "#d9a27e", "#c68863", "#a8704c", "#8d5a3b", "#5e3a24"];
const HAIR = ["#1d1a17", "#3a2a1c", "#5b4128", "#8a6a45", "#b9a07a", "#2a2a2a", "#7a3b1a"];
const JACKET = ["#1c2430", "#2b2f36", "#3a3326", "#1e2a22", "#30202a", "#3d4450"];

type Kit = { a: string; b: string; num: string; text: string };
const KITS: Record<"sun" | "nufc", Kit> = {
  nufc: { a: "#111214", b: "#f4f4f0", num: "#f4f4f0", text: "#111214" },
  sun: { a: "#d0121b", b: "#f4f4f0", num: "#111214", text: "#d0121b" },
};

/** A point on a quadratic curve, for the sag in a held-up scarf. */
const qpt = (t: number, p0: number[], c: number[], p1: number[]) => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
];

/** A knitted bar scarf held between two hands, sagging in the middle, with fringes. */
function HeldScarf({ l, r, kit }: { l: number[]; r: number[]; kit: Kit }) {
  const c = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2 + 9];
  const N = 8;
  const W = 9;
  const segs: React.ReactElement[] = [];
  for (let i = 0; i < N; i++) {
    const p = qpt(i / N, l, c, r);
    const q = qpt((i + 1) / N, l, c, r);
    segs.push(<path key={i} d={`M${p[0]} ${p[1] - W / 2} L${q[0]} ${q[1] - W / 2} L${q[0]} ${q[1] + W / 2} L${p[0]} ${p[1] + W / 2} Z`} fill={i % 2 ? kit.b : kit.a} stroke={i % 2 ? kit.b : kit.a} strokeWidth=".4" />);
  }
  const fringe = (pt: number[], dir: number) =>
    [-3, -1, 1, 3].map((dy) => <path key={`${dir}${dy}`} d={`M${pt[0]} ${pt[1] + dy} l${dir * 5} ${2 + Math.abs(dy) * 0.3}`} stroke={kit.a} strokeWidth="1" />);
  return (
    <g>
      {segs}
      {/* text on the middle bars */}
      {fringe(l, -1)}
      {fringe(r, 1)}
    </g>
  );
}

/** One fan, seen from behind, facing the pitch. Shoulder centre at (0,0). */
function Fan({ pose, top, head, kit, club, skin, hair, jacket, name, num, scarfDraped, crying = false, seed = 0 }: { pose: Pose; top: Top; head: Head; kit: Kit; club: "sun" | "nufc"; skin: string; hair: string; jacket: string; name: string; num: string; scarfDraped: boolean; crying?: boolean; seed?: number }) {
  const shirt = top === "shirt";
  const sleeve = shirt ? kit.a : jacket;
  const forearm = shirt ? skin : jacket;
  const bow = pose === "bowed" ? 7 : pose === "slump" ? 4 : 0;
  const hunch = pose === "bowed" || pose === "slump" ? 3 : 0;

  // shoulder, elbow, hand for each arm
  const A: Record<Pose, [number[], number[]] | null> = {
    armsUp: [[-30, -20], [-26, -54]],
    scarfUp: [[-34, -16], [-30, -48]],
    fist: [[-28, -22], [-20, -58]],
    clap: [[-31, 20], [-27, 2]],
    point: [[-30, -12], [-44, -40]],
    handsOnHead: [[-34, -22], [-9, -36]],
    bowed: null,
    slump: [[-26, 30], [-24, 54]],
    armsFolded: null,
    laugh: [[-34, 12], [-22, 26]],
    shrug: [[-32, 14], [-44, -2]],
  };
  const left = A[pose];
  const right: [number[], number[]] | null =
    pose === "fist" ? [[26, 28], [22, 54]] : pose === "point" ? [[26, 26], [22, 52]] : pose === "laugh" ? [[30, -14], [44, -40]] : left ? [[-left[0][0], left[0][1]], [-left[1][0], left[1][1]]] : null;

  const arm = (sh: number[], el: number[], ha: number[], k: string) => (
    <g key={k} strokeLinecap="round" fill="none">
      <path d={`M${sh[0]} ${sh[1]} L${el[0]} ${el[1]}`} stroke={shirt ? skin : sleeve} strokeWidth="9" />
      {shirt && <path d={`M${sh[0]} ${sh[1]} L${sh[0] + (el[0] - sh[0]) * 0.5} ${sh[1] + (el[1] - sh[1]) * 0.5}`} stroke={sleeve} strokeWidth="11.5" />}
      <path d={`M${el[0]} ${el[1]} L${ha[0]} ${ha[1]}`} stroke={forearm} strokeWidth="8" />
      <circle cx={ha[0]} cy={ha[1]} r={pose === "fist" && k === "l" ? 5.4 : 4.6} fill={skin} />
    </g>
  );

  const torso = `M-25 70 L-25 ${18 + hunch} Q-25 ${2 + hunch} -12 ${hunch} L12 ${hunch} Q25 ${2 + hunch} 25 ${18 + hunch} L25 70 Z`;
  const hy = -19 + bow - (pose === "laugh" ? 4 : 0);

  return (
    <g>
      {/* arms reaching up or out go behind the body line */}
      {left && pose !== "clap" && pose !== "slump" && arm([-19, 6 + hunch], left[0], left[1], "l")}
      {right && pose !== "clap" && pose !== "slump" && arm([19, 6 + hunch], right[0], right[1], "r")}

      {/* body */}
      <path d={torso} fill={shirt ? `url(#stripes-${club})` : jacket} />
      {shirt && (
        <>
          <text x="0" y={13 + hunch} textAnchor="middle" fontSize="7.5" fontWeight="900" letterSpacing=".4" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif" fill={kit.num} stroke={kit.text} strokeWidth="1.6" paintOrder="stroke" textLength={name.length > 4 ? 30 : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
          <text x="0" y={32 + hunch} textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif" fill={kit.num} stroke={kit.text} strokeWidth="2.2" paintOrder="stroke">{num}</text>
          <path d={`M-9 ${hunch} Q0 ${4 + hunch} 9 ${hunch}`} fill="none" stroke={kit.a} strokeWidth="3" />
        </>
      )}
      {!shirt && <path d={`M0 ${4 + hunch} L0 70`} stroke="#000" strokeOpacity=".25" strokeWidth="1" />}

      {/* arms down by the sides or clapping */}
      {(pose === "clap" || pose === "slump") && left && right && (
        <>
          {arm([-21, 8 + hunch], left[0], left[1], "l")}
          {arm([21, 8 + hunch], right[0], right[1], "r")}
        </>
      )}
      {pose === "armsFolded" && (
        <>
          <path d={`M-24 ${10 + hunch} Q-31 ${24 + hunch} -24 ${34 + hunch}`} fill="none" stroke={sleeve} strokeWidth="8" strokeLinecap="round" />
          <path d={`M24 ${10 + hunch} Q31 ${24 + hunch} 24 ${34 + hunch}`} fill="none" stroke={sleeve} strokeWidth="8" strokeLinecap="round" />
        </>
      )}

      {/* draped scarf round the neck, tails down the back */}
      {scarfDraped && (
        <g>
          <path d={`M-13 ${hunch - 1} Q0 ${7 + hunch} 13 ${hunch - 1}`} fill="none" stroke={kit.a} strokeWidth="7" strokeLinecap="round" />
          {!shirt && [0, 1, 2, 3, 4].map((k) => (
            <rect key={k} x="-12" y={3 + hunch + k * 7} width="9" height="7" fill={k % 2 ? kit.b : kit.a} transform={`rotate(4 -8 ${hunch})`} />
          ))}
          {!shirt && [-11, -9, -7, -5].map((fx) => <path key={fx} d={`M${fx} ${38 + hunch} l0.5 4`} stroke={kit.a} strokeWidth="1" transform={`rotate(4 -8 ${hunch})`} />)}
        </g>
      )}

      {/* neck and head from behind */}
      <rect x="-5.5" y={hy + 8} width="11" height={12 - bow} fill={skin} />
      <ellipse cx="-11" cy={hy + 1} rx="2.6" ry="4" fill={skin} />
      <ellipse cx="11" cy={hy + 1} rx="2.6" ry="4" fill={skin} />
      <ellipse cx="0" cy={hy} rx="11" ry="13" fill={head === "bald" ? skin : hair} />
      {head === "bald" && <ellipse cx="-3" cy={hy - 6} rx="4" ry="3" fill="#fff" opacity=".18" />}
      {head === "short" && <path d={`M-11 ${hy + 4} Q0 ${hy + 10} 11 ${hy + 4} L11 ${hy + 8} Q0 ${hy + 13} -11 ${hy + 8} Z`} fill={skin} opacity=".55" />}
      {head === "long" && <path d={`M-11 ${hy} Q-13 ${hy + 22} -6 ${hy + 24} L6 ${hy + 24} Q13 ${hy + 22} 11 ${hy} Z`} fill={hair} />}
      {head === "curly" && [-8, -3, 2, 7, -6, 0, 6].map((cx, k) => <circle key={k} cx={cx} cy={hy - 8 + (k > 3 ? 6 : 0)} r="5" fill={hair} />)}
      {head === "bobble" && (
        <g>
          <path d={`M-12.5 ${hy - 2} Q-13 ${hy - 22} 0 ${hy - 22} Q13 ${hy - 22} 12.5 ${hy - 2} Z`} fill={kit.a} />
          <rect x="-13" y={hy - 6} width="26" height="7" rx="2" fill={kit.b} />
          {[-9, -4.5, 0, 4.5, 9].map((x) => <path key={x} d={`M${x} ${hy - 6} l0 7`} stroke={kit.a} strokeWidth=".7" opacity=".5" />)}
          <circle cx="0" cy={hy - 23} r="5.5" fill={kit.b} />
          <circle cx="0" cy={hy - 23} r="5.5" fill="none" stroke={kit.a} strokeWidth=".6" strokeDasharray="1.5 1.5" />
        </g>
      )}
      {head === "cap" && (
        <g>
          <path d={`M-12 ${hy - 1} Q-12 ${hy - 17} 0 ${hy - 17} Q12 ${hy - 17} 12 ${hy - 1} Z`} fill={jacket === JACKET[0] ? "#2f3a4a" : "#1a1a1a"} />
          <path d={`M-5 ${hy - 1} Q0 ${hy - 6} 5 ${hy - 1}`} fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="1.6" />
        </g>
      )}

      {/* cartoon tears spraying out both sides of the head */}
      {crying &&
        [0, 1, 2].map((k) => (
          <g key={k}>
            <path className="tear-l" style={{ animationDelay: `${(seed + k * 0.37).toFixed(2)}s` }} d={`M-12 ${hy} q-4 6 0 9 q4 -3 0 -9 Z`} fill="#8fd0ff" stroke="#2b6f9e" strokeWidth=".6" />
            <path className="tear-r" style={{ animationDelay: `${(seed + 0.18 + k * 0.37).toFixed(2)}s` }} d={`M12 ${hy} q-4 6 0 9 q4 -3 0 -9 Z`} fill="#8fd0ff" stroke="#2b6f9e" strokeWidth=".6" />
          </g>
        ))}
      {/* hands on top of the head go over it */}
      {pose === "handsOnHead" && (
        <>
          <circle cx="-7" cy={hy - 11} r="5" fill={skin} />
          <circle cx="7" cy={hy - 11} r="5" fill={skin} />
        </>
      )}
      {/* bowed: elbows poking out the sides, hands over the face */}
      {pose === "bowed" && (
        <>
          <path d={`M-21 ${10 + hunch} Q-34 ${6 + hunch} -22 ${hy + 6}`} fill="none" stroke={sleeve} strokeWidth="9" strokeLinecap="round" />
          <path d={`M21 ${10 + hunch} Q34 ${6 + hunch} 22 ${hy + 6}`} fill="none" stroke={sleeve} strokeWidth="9" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

const BUBBLES: Record<CrowdMood, string[]> = {
  laugh: ["HAHAHA", "HAHAHAHA", "SMB", "HAHA", "SAD MACKEMS", "HAHAHA"],
  fluke: ["FLUKE", "JAMMY", "FLUKE", "WON'T LAST", "JAMMY GITS", "FLUKE"],
  disbelief: ["WHAT?!", "HOW?!", "EH?!", "PINCH US"],
  cry: ["WAAAH", "WHY US", "SOB", "WAAAH"],
  cheer: ["HOWAY", "UTM", "HWTL"],
};

/** Who's doing what. Mackems cry when they lose and can't believe it when they don't.
 *  Geordies laugh when the Mackems lose, and call it a fluke when they don't. */
const POSES: Record<CrowdMood, Pose[]> = {
  cry: ["bowed", "slump", "handsOnHead", "bowed", "slump"],
  disbelief: ["handsOnHead", "handsOnHead", "shrug", "handsOnHead", "armsUp"],
  laugh: ["laugh", "laugh", "point", "laugh", "armsUp", "scarfUp"],
  fluke: ["point", "armsFolded", "shrug", "point", "scarfUp"],
  cheer: ["armsUp", "scarfUp", "fist", "clap", "armsUp", "scarfUp", "point"],
};

function Bubble({ x, y, text, sun }: { x: number; y: number; text: string; sun: boolean }) {
  const w = text.length * 8.8 + 16;
  const bx = Math.min(Math.max(x - w / 2, 3), 797 - w);
  const by = Math.max(y - 22, 2);
  return (
    <g className="pop">
      <path d={`M${x - 5} ${by + 19} L${x + 2} ${by + 27} L${x + 5} ${by + 19} Z`} fill="#fff" stroke="#111" strokeWidth="1.4" />
      <rect x={bx} y={by} width={w} height="20" rx="9" fill="#fff" stroke="#111" strokeWidth="1.6" />
      <rect x={x - 4} y={by + 17} width="8" height="3" fill="#fff" />
      <text x={bx + w / 2} y={by + 14.5} textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif" fill={sun ? "#b3121a" : "#111"} textLength={w - 14} lengthAdjust="spacingAndGlyphs">{text}</text>
    </g>
  );
}

export function Crowd({ club, result, mood: moodIn }: { club: "sun" | "nufc"; result: Result | null; mood?: CrowdMood }) {
  const sun = club === "sun";
  const rand = rng(sun ? 1879 : 1892);
  const kit = KITS[club];
  const mood: CrowdMood = moodIn ?? (sun ? (result === "W" || result === "D" ? "disbelief" : "cry") : "cheer");
  const rows = [
    { y: 74, scale: 0.6, n: 19, shade: 0.55 },
    { y: 100, scale: 0.78, n: 15, shade: 0.3 },
    { y: 134, scale: 1, n: 12, shade: 0 },
  ];
  const names = sun ? ["SMB", "SAD", "MACKEM", "BOTTLER", "SMB", "WEAR"] : ["TOON", "HOWAY", "GEORDIE", "UTM", "HWTL", "TOON"];
  const nums = sun ? ["0"] : ["9", "10", "7", "8", "4", "11", "5", "1"];
  const bubbles: { x: number; y: number; text: string }[] = [];
  const crying = mood === "cry";
  const label = {
    cry: "Sunderland fans from behind, every one of them crying",
    disbelief: "Sunderland fans from behind, hands on heads, can't believe it",
    laugh: "Toon fans from behind, laughing their heads off at the Mackems",
    fluke: "Toon fans from behind, pointing and shouting fluke",
    cheer: "Toon fans from behind in black and white shirts, arms and scarves up",
  }[mood];

  return (
    <svg viewBox="0 0 800 170" className="block w-full" preserveAspectRatio="xMidYMax slice" role="img" aria-label={label}>
      <defs>
        <pattern id={`stripes-${club}`} patternUnits="userSpaceOnUse" width="14" height="10" x="-7">
          <rect width="14" height="10" fill={kit.b} />
          <rect width="7" height="10" fill={kit.a} />
        </pattern>
        <linearGradient id={`haze${club}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sun ? "#ff8a8a" : "#fff6c9"} stopOpacity="0" />
          <stop offset=".45" stopColor={sun ? "#ff9a9a" : "#fff6c9"} stopOpacity={sun ? ".2" : ".4"} />
          <stop offset="1" stopColor={sun ? "#ff9a9a" : "#fff6c9"} stopOpacity=".06" />
        </linearGradient>
      </defs>
      <rect width="800" height="170" fill={`url(#haze${club})`} />
      {rows.map((row, ri) => (
        <g key={ri}>
          {Array.from({ length: row.n }, (_, i) => {
            const s = row.scale * (0.93 + rand() * 0.14);
            const x = (i + 0.5) * (800 / row.n) + (rand() - 0.5) * 18;
            const y = row.y + (rand() - 0.5) * 5;
            const list = POSES[mood];
            const pose = list[Math.floor(rand() * list.length)];
            const top: Top = rand() < (sun ? 0.55 : 0.68) ? "shirt" : "jacket";
            const hr = rand();
            const head: Head = hr < 0.24 ? "bobble" : hr < 0.36 ? "cap" : hr < 0.52 ? "bald" : hr < 0.64 ? "curly" : hr < 0.74 ? "long" : "short";
            const skin = SKIN[Math.floor(rand() * SKIN.length)];
            const hair = HAIR[Math.floor(rand() * HAIR.length)];
            const jacket = JACKET[Math.floor(rand() * JACKET.length)];
            const num = nums[Math.floor(rand() * nums.length)];
            const name = names[Math.floor(rand() * names.length)];
            const scarfDraped = pose !== "scarfUp" && rand() < (top === "jacket" ? 0.7 : 0.25);
            const delay = (rand() * 0.8).toFixed(2);
            const anim =
              mood === "cry" ? "sob" : mood === "laugh" && pose === "laugh" ? "guffaw" : (mood === "cheer" || mood === "laugh") && (pose === "armsUp" || pose === "scarfUp" || pose === "fist") ? "bounce" : undefined;
            const talk = ri > 0 && rand() < 0.34;
            if (talk) bubbles.push({ x, y: y - (pose === "scarfUp" || pose === "armsUp" ? 66 : 50) * s, text: BUBBLES[mood][Math.floor(rand() * BUBBLES[mood].length)] });
            return (
              <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`}>
                <g className={anim} style={anim ? { animationDelay: `${delay}s` } : undefined}>
                  <Fan pose={pose} top={top} head={head} kit={kit} club={club} skin={skin} hair={hair} jacket={jacket} name={name} num={num} scarfDraped={scarfDraped} crying={crying} seed={Number(delay)} />
                  {pose === "scarfUp" && (
                    <>
                      <HeldScarf l={[-30, -48]} r={[30, -48]} kit={kit} />
                      <circle cx="-30" cy="-48" r="4.6" fill={skin} />
                      <circle cx="30" cy="-48" r="4.6" fill={skin} />
                    </>
                  )}
                  {mood === "disbelief" && rand() < 0.35 && (
                    <text x="0" y="-46" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff" stroke="#111" strokeWidth="2" paintOrder="stroke" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">?!</text>
                  )}
                </g>
              </g>
            );
          })}
          {/* distance haze so the back rows sit back */}
          {row.shade > 0 && <rect x="0" y="0" width="800" height={row.y + 80 * row.scale} fill={sun ? "#2a0b0b" : "#0e1116"} opacity={row.shade} />}
        </g>
      ))}
      {/* speech bubbles go over everyone; keep them from piling on top of each other */}
      {bubbles
        .filter((b, i, all) => all.findIndex((o) => Math.abs(o.x - b.x) < 70 && Math.abs(o.y - b.y) < 24) === i)
        .map((b, i) => <Bubble key={i} {...b} sun={sun} />)}
    </svg>
  );
}
