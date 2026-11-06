import type { DangerLevel } from "@/lib/misery/index";

/** THE MACKEM MISERY INDEX — the number, what it's made of, and how it moved this week. */
export function MiseryIndex({
  score,
  label,
  movement,
  biggest,
  spark,
  parts,
  compact = false,
}: {
  score: number;
  label: string;
  movement: number;
  biggest: string | null;
  spark: { at: string; v: number }[];
  parts: { odds: number; position: number; results: number };
  compact?: boolean;
}) {
  const rows = [
    { k: "Relegation odds", v: parts.odds, max: 40 },
    { k: "League position", v: parts.position, max: 20 },
    { k: "Recent results", v: parts.results, max: 40 },
  ];
  return (
    <div className="panel panel-top mackem p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display text-2xl sm:text-3xl">Misery Index</h3>
        <span className={`scoreboard-num text-sm ${movement > 0 ? "text-mackem" : movement < 0 ? "text-pitch" : "text-silver"}`}>
          {movement > 0 ? "▲" : movement < 0 ? "▼" : "–"} {Math.abs(movement)} this week
        </span>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <span className="scoreboard-num text-7xl leading-none text-mackem">{score}</span>
        <span className="pb-1 text-silver">/ 100</span>
      </div>
      <p className="mt-2 text-lg text-chalk">{label}</p>

      <dl className="mt-4 grid gap-2">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-2 text-sm">
            <dt className="text-silver">{r.k}</dt>
            <dd className="h-1.5 bg-slate">
              <div className="h-full bg-mackem" style={{ width: `${Math.max(0, (r.v / r.max) * 100)}%` }} />
            </dd>
            <dd className="scoreboard-num text-right">{r.v > 0 ? `+${r.v}` : r.v}</dd>
          </div>
        ))}
      </dl>
      {!compact && biggest && <p className="mt-3 text-sm text-silver">Biggest change this week: <span className="text-chalk">{biggest}</span></p>}
      {!compact && <Spark data={spark} />}
    </div>
  );
}

function Spark({ data }: { data: { at: string; v: number }[] }) {
  if (data.length < 2) return null;
  const w = 140, h = 30;
  const xs = data.map((_, i) => (i / (data.length - 1)) * w);
  const ys = data.map((d) => h - (d.v / 100) * h);
  return (
    <svg width={w} height={h} className="mt-1" aria-label="Misery index over the last week">
      <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")} fill="none" stroke="#e0161f" strokeWidth="2" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill="#f4f4f0" />
    </svg>
  );
}

const LEVELS: DangerLevel[] = ["Comfortable", "Getting Nervous", "Danger Zone", "Championship Bound", "Absolute Panic"];

/** Semi-circular relegation danger gauge. Needle = modelled relegation probability. */
export function DangerGauge({ p, level }: { p: number; level: DangerLevel }) {
  const angle = -90 + Math.max(0, Math.min(1, p)) * 180;
  const arc = (from: number, to: number) => {
    const r = 120, cx = 150, cy = 150;
    const a0 = Math.PI * (1 - from), a1 = Math.PI * (1 - to);
    return `M${cx + r * Math.cos(a0)} ${cy - r * Math.sin(a0)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy - r * Math.sin(a1)}`;
  };
  const stops = [0, 0.1, 0.3, 0.6, 0.85, 1];
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 300 180" className="w-full max-w-[380px]" role="img" aria-label={`Relegation danger: ${level}, ${(p * 100).toFixed(0)} percent`}>
        {stops.slice(0, -1).map((s, i) => (
          <path key={i} d={arc(s, stops[i + 1])} stroke={["#2e8b4f", "#a7aeb7", "#e8a317", "#e0161f", "#8f0d13"][i]} strokeWidth="22" fill="none" opacity={LEVELS[i] === level ? 1 : 0.45} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => {
          const a = Math.PI * (1 - i / 10);
          return <line key={i} x1={150 + 98 * Math.cos(a)} y1={150 - 98 * Math.sin(a)} x2={150 + 106 * Math.cos(a)} y2={150 - 106 * Math.sin(a)} stroke="#a7aeb7" strokeWidth="1.5" />;
        })}
        <g className="needle" style={{ transform: `rotate(${angle}deg)` }}>
          <polygon points="146,150 154,150 150,40" fill="#f4f4f0" />
        </g>
        <circle cx="150" cy="150" r="11" fill="#050607" stroke="#f4f4f0" strokeWidth="2" />
        <text x="30" y="172" fill="#a7aeb7" fontSize="10" fontFamily="var(--font-mono)">0%</text>
        <text x="252" y="172" fill="#a7aeb7" fontSize="10" fontFamily="var(--font-mono)">100%</text>
      </svg>
      <figcaption className="-mt-2 text-center">
        <div className="display text-3xl text-mackem">{level}</div>
        <div className="text-xs text-silver">Danger level</div>

      </figcaption>
    </figure>
  );
}

/** Small companion to the jar. */
export function HappinessMeter({ score, line }: { score: number; line: string }) {
  return (
    <div className="panel panel-top p-4">
      <div className="kicker">Geordie Happiness Meter</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="scoreboard-num text-4xl">{score}</span>
        <div className="h-3 flex-1 bg-slate">
          <div className="bar-grow h-full" style={{ width: `${score}%`, background: "var(--stripe)" }} />
        </div>
      </div>
      <p className="mt-1 text-sm text-mist">{line}</p>
    </div>
  );
}
