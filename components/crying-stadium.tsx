/**
 * The Stadium of Light, having a moment. An original cartoon (no club badge, no branding):
 * a red-seated bowl with a face on it. Its mood comes from Sunderland's last real result.
 */
export function CryingStadium({ mood, caption }: { mood: "W" | "D" | "L"; caption: string }) {
  const crying = mood === "L";
  const sulking = mood === "D";
  return (
    <figure className="w-full max-w-[540px]">
      <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label={crying ? "The Stadium of Light, crying its eyes out" : sulking ? "The Stadium of Light, sulking" : "The Stadium of Light, nervously happy"}>
        {/* floodlights */}
        {[40, 360].map((x) => (
          <g key={x}>
            <rect x={x - 3} y="40" width="6" height="150" fill="#3a4048" />
            <rect x={x - 20} y="26" width="40" height="18" rx="3" fill="#d5d9de" />
            <rect x={x - 16} y="30" width="32" height="10" fill="#fff8d6" />
          </g>
        ))}
        {/* roof */}
        <path d="M60 92 Q200 52 340 92 L330 110 Q200 74 70 110 Z" fill="#d5d9de" />
        {/* the bowl: red seats with white rows */}
        <path d="M70 110 Q200 74 330 110 L345 225 Q200 250 55 225 Z" fill="#c8101a" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${66 - i * 2} ${128 + i * 20} Q200 ${96 + i * 22} ${334 + i * 2} ${128 + i * 20}`} fill="none" stroke="#f4f4f0" strokeOpacity=".35" strokeWidth="2" />
        ))}
        {/* pitch-side wall */}
        <path d="M55 225 Q200 250 345 225 L345 240 Q200 266 55 240 Z" fill="#8f0d13" />

        {/* the face */}
        <g className={crying ? "sob" : ""}>
          {/* eyebrows */}
          {crying || sulking ? (
            <>
              <path d="M128 120 L168 132" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
              <path d="M272 120 L232 132" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M130 124 Q150 112 170 124" fill="none" stroke="#111214" strokeWidth="6" strokeLinecap="round" />
              <path d="M230 124 Q250 112 270 124" fill="none" stroke="#111214" strokeWidth="6" strokeLinecap="round" />
            </>
          )}
          {/* eyes */}
          {crying ? (
            <>
              <path d="M132 150 Q150 138 168 150" fill="none" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
              <path d="M232 150 Q250 138 268 150" fill="none" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
            </>
          ) : sulking ? (
            <>
              <path d="M134 148 L166 148" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
              <path d="M234 148 L266 148" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="150" cy="148" r="13" fill="#f4f4f0" stroke="#111214" strokeWidth="4" />
              <circle cx="250" cy="148" r="13" fill="#f4f4f0" stroke="#111214" strokeWidth="4" />
              <circle cx="153" cy="150" r="5" fill="#111214" />
              <circle cx="253" cy="150" r="5" fill="#111214" />
            </>
          )}
          {/* mouth */}
          {crying ? (
            <ellipse cx="200" cy="200" rx="34" ry="24" fill="#111214" />
          ) : sulking ? (
            <path d="M172 204 Q200 196 228 204" fill="none" stroke="#111214" strokeWidth="7" strokeLinecap="round" />
          ) : (
            <path d="M170 196 Q185 210 200 198 Q215 210 230 196" fill="none" stroke="#111214" strokeWidth="6" strokeLinecap="round" />
          )}
          {crying && <ellipse cx="200" cy="210" rx="16" ry="8" fill="#e0161f" />}
        </g>

        {/* tears */}
        {crying && (
          <>
            {[142, 158, 242, 258].map((x, i) => (
              <path key={x} className="stream" d={`M${x} 156 Q${x + (i % 2 ? 8 : -8)} 200 ${x + (i % 2 ? 4 : -4)} 262`} fill="none" stroke="#7cc8ff" strokeWidth="6" strokeLinecap="round" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
            <ellipse className="puddle" cx="200" cy="278" rx="150" ry="12" fill="#7cc8ff" opacity=".6" />
          </>
        )}
        {sulking && <path className="stream" d="M162 156 Q158 190 160 230" fill="none" stroke="#7cc8ff" strokeWidth="5" strokeLinecap="round" />}
        {!crying && !sulking && <circle cx="282" cy="118" r="6" fill="#7cc8ff" opacity=".9" />}

        {/* speech bubble */}
        <g transform="translate(286 52)">
          <rect x="-4" y="-26" width={crying ? 112 : 92} height="40" rx="8" fill="#f4f4f0" />
          <path d="M8 14 L0 30 L22 14 Z" fill="#f4f4f0" />
          <text x={crying ? 52 : 42} y="2" textAnchor="middle" fontSize="20" fontWeight="900" fontStyle="italic" fill="#111214" fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif">
            {crying ? "WAAAAH" : sulking ? "huff." : "phew…"}
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center font-mono text-xs font-bold uppercase tracking-wider text-chalk/80">{caption}</figcaption>
    </figure>
  );
}
