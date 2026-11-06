"use client";
import { useEffect, useId, useRef, useState } from "react";

const QUIPS = [
  "Careful. That's vintage Wearside.",
  "Still warm.",
  "Do not drink. Seriously.",
  "Shake it all you like. The table won't change.",
  "Hand-collected on Wearside.",
  "Hear that? That's the Stadium of Light.",
];

/**
 * THE TEARS INDEX JAR — the house icon.
 * Fill = the Tears Index (lib/tears): how much Sunderland supporters have got to cry about. This component only draws it:
 * a glass jar with a sloshing liquid (spring physics driven by scroll, pointer and taps), bubbles,
 * reflections, a printed label and milestone reactions.
 */
export function TearJar({
  percent,
  size = 300,
  showCounts = true,
  label = true,
}: {
  percent: number; // the Tears Index, 0..100
  size?: number;
  showCounts?: boolean;
  label?: boolean;
}) {
  const tears = Math.round(percent * 1000); // fictional, and labelled as such
  const target = Math.max(0, Math.min(100, percent));
  const [level, setLevel] = useState(target); // true level on the server; replayed on first view
  const [count, setCount] = useState(tears);
  const [tilt, setTilt] = useState(0);
  const [pop, setPop] = useState<number | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const [splashes, setSplashes] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const phys = useRef({ a: 0, v: 0, force: 0 });
  const uid = `j${useId().replace(/[^a-zA-Z0-9]/g, "")}`; // stable across server and client

  // Spring physics for the liquid surface.
  useEffect(() => {
    let raf = 0;
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      phys.current.force += Math.max(-6, Math.min(6, dy * 0.08));
    };
    const step = () => {
      const p = phys.current;
      const acc = -0.06 * p.a - 0.08 * p.v + p.force;
      p.force = 0;
      p.v += acc;
      p.a = Math.max(-16, Math.min(16, p.a + p.v));
      if (Math.abs(p.a) > 0.05 || Math.abs(p.v) > 0.05) setTilt(p.a);
      raf = requestAnimationFrame(step);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Fill animation the first time the jar is seen, then a milestone reaction.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started) return;
        started = true;
        setLevel(0);
        setCount(0);
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / 2400);
          const ease = 1 - Math.pow(1 - k, 3);
          setLevel(target * ease);
          setCount(Math.round(tears * ease));
          if (k < 1) requestAnimationFrame(tick);
          else {
            const m = [100, 75, 50, 25].find((x) => target >= x);
            if (m) {
              setPop(m);
              setSplashes((n) => n + 1);
              phys.current.force += 5;
            }
          }
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, tears]);

  const W = 260, H = 340;
  const top = 92, bottom = 302, h = bottom - top;
  const y = bottom - (h * level) / 100;
  const overflow = level >= 99.9;
  const body = "M70 92 Q46 98 42 128 L42 286 Q42 312 72 312 L188 312 Q218 312 218 286 L218 128 Q214 98 190 92 Z";

  return (
    <div ref={ref} className="relative inline-flex flex-col items-center">
      <button
        type="button"
        className="relative cursor-pointer select-none touch-manipulation"
        aria-label={`The Tears Index: ${target.toFixed(0)} percent. Tap the jar to shake it.`}
        onPointerMove={(e) => (phys.current.force += Math.max(-2, Math.min(2, e.movementX * 0.05)))}
        onClick={() => {
          phys.current.force += (Math.random() > 0.5 ? 1 : -1) * 9;
          setSplashes((n) => n + 1);
          setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={size * 0.82} height={size * 1.07} aria-hidden>
          <defs>
            <clipPath id={`${uid}-in`}><path d={body} /></clipPath>
            <pattern id={`${uid}-st`} width="26" height="10" patternUnits="userSpaceOnUse">
              <rect width="26" height="10" fill="#c8101a" />
              <rect width="8" height="10" fill="#f4f4f0" opacity="0.22" />
            </pattern>
            <linearGradient id={`${uid}-depth`} x1="0" x2="1">
              <stop offset="0" stopColor="#3a0205" stopOpacity=".75" />
              <stop offset=".25" stopColor="#3a0205" stopOpacity="0" />
              <stop offset=".75" stopColor="#3a0205" stopOpacity="0" />
              <stop offset="1" stopColor="#3a0205" stopOpacity=".8" />
            </linearGradient>
            <linearGradient id={`${uid}-glass`} x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".28" />
              <stop offset=".12" stopColor="#fff" stopOpacity=".05" />
              <stop offset=".85" stopColor="#fff" stopOpacity=".03" />
              <stop offset="1" stopColor="#fff" stopOpacity=".22" />
            </linearGradient>
            <radialGradient id={`${uid}-glow`} cx=".5" cy=".7" r=".6">
              <stop offset="0" stopColor="#e0161f" stopOpacity=".5" />
              <stop offset="1" stopColor="#e0161f" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx="130" cy="236" rx="140" ry="120" fill={`url(#${uid}-glow)`} />
          <ellipse cx="130" cy="322" rx="98" ry="10" fill="#000" opacity=".55" />

          {/* tears dropping in */}
          {level > 2 &&
            [0, 1, 2].map((i) => (
              <path key={i} className="tear-fall" style={{ animationDelay: `${i * 0.9}s`, ["--fall" as string]: `${Math.max(50, y - 30)}px` }} d={`M${112 + i * 18} 30 q5 9 0 14 q-5 -5 0 -14Z`} fill={i === 1 ? "#f4f4f0" : "#ff3d44"} />
            ))}

          {/* back of the rim */}
          <ellipse cx="130" cy="76" rx="58" ry="9" fill="none" stroke="#d5d9de" strokeOpacity=".35" strokeWidth="2" />

          {/* liquid */}
          <g clipPath={`url(#${uid}-in)`}>
            <rect x="0" y="0" width={W} height={H} fill="rgba(255,255,255,.03)" />
            <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `130px ${y}px` }}>
              <g style={{ transform: `translateY(${y - top}px)` }}>
                <g className="jar-wave slow"><path d={wave(top - 7, 520)} fill="#7d0a10" /></g>
                <g className="jar-wave">
                  <path d={wave(top, 520)} fill={`url(#${uid}-st)`} />
                </g>
                {/* meniscus: the liquid's top surface seen in perspective */}
                <ellipse cx="130" cy={top + 2} rx="96" ry="7" fill="#ff4a50" opacity=".55" />
                <ellipse cx="110" cy={top + 1} rx="40" ry="2.5" fill="#fff" opacity=".35" />
              </g>
            </g>
            <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-depth)`} />
            {level > 4 &&
              [62, 96, 130, 160, 190].map((x, i) => (
                <circle key={i} cx={x} cy={300} r={2 + (i % 3)} fill="#fff" opacity=".55" className="jar-bubble" style={{ animationDelay: `${i * 0.8}s` }} />
              ))}
          </g>

          {/* glass body, thickness and reflections */}
          <path d={body} fill={`url(#${uid}-glass)`} stroke="#e7eaee" strokeOpacity=".7" strokeWidth="2.5" />
          <path d="M50 130 L50 284 Q50 304 72 305" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="6" />
          <path d="M60 128 L60 270" stroke="#fff" strokeOpacity=".45" strokeWidth="7" strokeLinecap="round" />
          <path d="M74 120 L74 160" stroke="#fff" strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" />
          <path d="M206 140 L206 250" stroke="#fff" strokeOpacity=".18" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="130" cy="310" rx="86" ry="6" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="2" />
          {/* neck and front rim */}
          <path d="M76 76 L76 92 M184 76 L184 92" stroke="#e7eaee" strokeOpacity=".7" strokeWidth="2.5" />
          <path d="M72 78 Q130 94 188 78" fill="none" stroke="#f4f4f0" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round" />

          {/* printed label */}
          {label && (
            <g transform="translate(130 196)">
              <path d="M-74 -30 Q0 -36 74 -30 L74 30 Q0 36 -74 30 Z" fill="#efeee8" opacity=".94" />
              <path d="M-74 -30 Q0 -36 74 -30" fill="none" stroke="#0b0b0c" strokeWidth="1" />
              <text y="-12" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e0161f" fontFamily="ui-monospace, monospace" letterSpacing="1.5">HOWAYSTATS</text>
              <text y="8" textAnchor="middle" fontSize="19" fontWeight="900" fontStyle="italic" fill="#0b0b0c" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">WEARSIDE TEARS</text>
              <text y="22" textAnchor="middle" fontSize="7.5" fill="#0b0b0c" fontFamily="ui-monospace, monospace" letterSpacing="1">100% MACKEM · DO NOT DRINK</text>
            </g>
          )}

          {[25, 50, 75].map((m) => {
            const ty = bottom - (h * m) / 100;
            return (
              <g key={m} opacity={level >= m ? 1 : 0.45}>
                <line x1="218" y1={ty} x2="230" y2={ty} stroke={level >= m ? "#e0161f" : "#a7aeb7"} strokeWidth="2" />
                <text x="233" y={ty + 4} fontSize="10" fill={level >= m ? "#f4f4f0" : "#a7aeb7"} fontFamily="ui-monospace, monospace">{m}</text>
              </g>
            );
          })}

          {overflow && (
            <g>
              <path d="M74 80 Q48 90 44 130 L44 240" stroke="#c8101a" strokeWidth="8" fill="none" style={{ transformOrigin: "60px 80px", animation: "spill 1.4s ease-out both" }} />
              <path d="M186 80 Q212 90 216 130 L216 270" stroke="#c8101a" strokeWidth="8" fill="none" style={{ transformOrigin: "200px 80px", animation: "spill 1.8s ease-out both" }} />
              <ellipse cx="130" cy="326" rx="120" ry="9" fill="#8f0d13" opacity=".85" />
            </g>
          )}

          {/* splash droplets on taps and milestones */}
          {splashes > 0 &&
            [-30, -12, 8, 26].map((dx, i) => (
              <circle key={`${splashes}-${i}`} cx={130 + dx} cy={Math.max(84, y)} r={3 + (i % 2)} fill="#ff3d44" className="splash" style={{ ["--dx" as string]: `${dx * 0.8}px`, animationDelay: `${i * 0.04}s` }} />
            ))}
        </svg>
      </button>

      {pop !== null && (
        <div key={pop} className="milestone-pop pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap">
          <span className="ribbon text-lg">{pop === 100 ? "It's overflowing" : `${pop}% full`}</span>
        </div>
      )}
      {quip && (
        <p key={`${splashes}-q`} className="quip pointer-events-none absolute bottom-24 left-1/2 w-max max-w-[90%] -translate-x-1/2 bg-chalk px-3 py-1 text-sm font-bold text-ink">
          {quip}
        </p>
      )}

      {showCounts && (
        <div className="mt-1 grid w-full grid-cols-2 gap-3 text-center">
          <div>
            <div className="scoreboard-num text-2xl text-chalk">{level.toFixed(0)}%</div>
            <div className="text-xs text-silver">Tears Index (from real stats)</div>
          </div>
          <div>
            <div className="scoreboard-num text-2xl text-chalk">{count.toLocaleString("en-GB")}</div>
            <div className="text-xs text-silver">tears (made up, obviously)</div>
          </div>
        </div>
      )}
    </div>
  );
}

function wave(yTop: number, width: number) {
  const amp = 5, len = 64;
  let d = `M-130 ${yTop}`;
  for (let x = -130; x <= width; x += len) d += ` q${len / 4} ${-amp} ${len / 2} 0 t${len / 2} 0`;
  return `${d} L${width} 360 L-130 360 Z`;
}
