/**
 * A terrace of invented cartoon Mackems in bobble hats. Nobody real. How many are crying,
 * and how hard, follows the real state of Sunderland (heat 0..4).
 */
export function CryingFans({ heat, count = 9 }: { heat: number; count?: number }) {
  const fans = Array.from({ length: count }, (_, i) => i);
  // Higher heat: more fans crying, harder.
  const cryingShare = [0, 0.25, 0.5, 0.8, 1][Math.max(0, Math.min(4, heat))];
  return (
    <div className="flex items-end justify-center gap-0 overflow-hidden" aria-label={`${Math.round(cryingShare * count)} cartoon Mackems crying`} role="img">
      {fans.map((i) => {
        const cries = i / count < cryingShare || (heat >= 4);
        const wail = heat >= 3 && cries && i % 2 === 0;
        const lift = (i * 13) % 3;
        return (
          <svg key={i} viewBox="0 0 80 110" className={`w-[11%] min-w-[44px] max-w-[84px] ${cries ? "sob" : ""}`} style={{ animationDelay: `${(i * 0.17).toFixed(2)}s`, marginBottom: `${lift * 4}px` }} aria-hidden="true">
            {/* body + scarf */}
            <path d="M10 110 Q12 76 40 74 Q68 76 70 110 Z" fill={i % 3 === 0 ? "#2a2f36" : i % 3 === 1 ? "#3a4048" : "#23272d"} />
            <rect x="22" y="72" width="36" height="9" rx="3" fill="#e0161f" />
            <rect x="28" y="72" width="5" height="9" fill="#f4f4f0" /><rect x="40" y="72" width="5" height="9" fill="#f4f4f0" />
            <rect x="46" y="78" width="8" height="22" rx="2" fill="#e0161f" />
            {/* head */}
            <circle cx="40" cy="50" r="22" fill={["#f2c9a5", "#d9a47f", "#a8714f", "#f5d5b8", "#c58c66"][i % 5]} />
            {/* bobble hat, red and white */}
            <path d="M18 44 Q40 14 62 44 Z" fill="#e0161f" />
            <rect x="18" y="40" width="44" height="7" rx="3" fill="#f4f4f0" />
            <circle cx="40" cy="20" r="6" fill="#f4f4f0" />
            {/* face */}
            {cries ? (
              <>
                <path d="M28 54 Q32 50 36 54" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M44 54 Q48 50 52 54" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
                {wail ? <ellipse cx="40" cy="64" rx="6" ry="5" fill="#111214" /> : <path d="M33 66 Q40 60 47 66" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />}
                <path className="stream" d="M31 56 Q29 66 30 78" fill="none" stroke="#7cc8ff" strokeWidth="3" strokeLinecap="round" />
                <path className="stream" d="M49 56 Q51 66 50 78" fill="none" stroke="#7cc8ff" strokeWidth="3" strokeLinecap="round" style={{ animationDelay: ".3s" }} />
              </>
            ) : (
              <>
                <circle cx="32" cy="54" r="2.5" fill="#111214" />
                <circle cx="48" cy="54" r="2.5" fill="#111214" />
                <path d="M34 65 L46 65" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
          </svg>
        );
      })}
    </div>
  );
}
