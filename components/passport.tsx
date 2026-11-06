/**
 * The Toon Army passport: an open booklet. Left page = visas (real European away days from the
 * club's history plus this season's status stamp, driven by the real Europe odds). Right page =
 * the biodata page with guilloche security print, a silhouette photo, fields and a machine-readable zone.
 * The holder is a silhouette, never a real person.
 */

import type React from "react";

export const MONO = "var(--font-jetbrains), ui-monospace, monospace";
export const DISPLAY = "var(--font-barlow), 'Arial Narrow', sans-serif";
export const SERIF = "var(--font-serif4), Georgia, serif";

/** Wavy security lines across a page. */
export function guilloche(x0: number, x1: number, y0: number, y1: number, lines: number, amp: number, seed: number) {
  const out: string[] = [];
  for (let k = 0; k < lines; k++) {
    const base = y0 + ((y1 - y0) * (k + 0.5)) / lines;
    let d = "";
    for (let x = x0; x <= x1; x += 4) {
      const y = base + amp * Math.sin((x - x0) / 17 + k * 0.7 + seed) + (amp / 2) * Math.sin((x - x0) / 7.3 + k * 1.3);
      d += `${x === x0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    out.push(d);
  }
  return out;
}

/** A spirograph rosette, the bit in the middle of every banknote and passport. */
export function rosette(cx: number, cy: number, r: number, petals: number, depth: number) {
  let d = "";
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 2;
    const rr = r + depth * Math.sin(petals * t);
    d += `${i ? "L" : "M"}${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * Math.sin(t)).toFixed(1)} `;
  }
  return d + "Z";
}

const pad44 = (s: string) => (s + "<".repeat(44)).slice(0, 44);

const STATUS_INK: Record<string, string> = { Approved: "#1f7a43", Pending: "#a8740a", "Next year": "#b3261e" };

/**
 * The best European nights, home and away. Every date and score checked:
 * Fairs Cup final 1969; Champions League 1997, 2002, 2023, 2025/26.
 */
type Stamp = { city: string; venue: string; score: string; date: string; foot: string; ink: string; shape: "rect" | "circle" | "oval"; x: number; y: number; rot: number };
const VISAS: Stamp[] = [
  { city: "BUDAPEST", venue: "FAIRS CUP FINAL", score: "ÚJPEST 2-3 NUFC", date: "11 JUN 1969", foot: "WINNERS", ink: "#1d3f8f", shape: "rect", x: 26, y: 46, rot: -6 },
  { city: "TOON", venue: "ST JAMES' PARK", score: "NUFC 4-1 PSG", date: "04 OCT 2023", foot: "BATTERED", ink: "#a51d24", shape: "circle", x: 236, y: 92, rot: 9 },
  { city: "TOON", venue: "ST JAMES' PARK", score: "NUFC 3-2 BARÇA", date: "17 SEP 1997", foot: "ASPRILLA HAT-TRICK", ink: "#4b2a7b", shape: "oval", x: 88, y: 152, rot: -10 },
  { city: "ROTTERDAM", venue: "DE KUIP", score: "FEYENOORD 2-3 NUFC", date: "13 NOV 2002", foot: "LATE WINNER", ink: "#2d5f5d", shape: "rect", x: 168, y: 150, rot: 6 },
  { city: "BAKU", venue: "QARABAĞ", score: "QARABAĞ 1-6 NUFC", date: "18 FEB 2026", foot: "SIX. SIX.", ink: "#8a3b12", shape: "circle", x: 74, y: 256, rot: 7 },
  { city: "MILANO", venue: "SAN SIRO", score: "MILAN 0-0 NUFC", date: "19 SEP 2023", foot: "SEEN IN MILAN", ink: "#a51d24", shape: "oval", x: 186, y: 250, rot: -8 },
  { city: "BELGIË", venue: "UNION SG", score: "UNION 0-4 NUFC", date: "01 OCT 2025", foot: "CRUISED", ink: "#1d3f8f", shape: "rect", x: 184, y: 292, rot: 4 },
];

function Visa({ v }: { v: Stamp }) {
  const common = { fill: "none", stroke: v.ink, strokeWidth: 2.2 } as const;
  const text = (cy: number) => (
    <>
      <text x="0" y={cy - 12} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily={DISPLAY} letterSpacing="1">{v.city}</text>
      <text x="0" y={cy - 2} textAnchor="middle" fontSize="6">{v.venue}</text>
      <text x="0" y={cy + 9} textAnchor="middle" fontSize="7.2" fontWeight="700">{v.score}</text>
      <text x="0" y={cy + 18} textAnchor="middle" fontSize="5.8">{v.date}</text>
      <text x="0" y={cy + 26} textAnchor="middle" fontSize="5.6" fontWeight="700">{v.foot}</text>
    </>
  );
  return (
    <g transform={`translate(${v.x} ${v.y}) rotate(${v.rot})`} opacity=".86" fontFamily={MONO} fill={v.ink}>
      {v.shape === "rect" && (
        <g transform="translate(52 0)">
          <rect x="-54" y="0" width="108" height="66" rx="4" {...common} />
          <rect x="-50" y="4" width="100" height="58" rx="2" {...common} strokeWidth={0.8} />
          {text(30)}
        </g>
      )}
      {v.shape === "circle" && (
        <>
          <circle r="44" {...common} />
          <circle r="39" {...common} strokeWidth={0.8} />
          {text(0)}
        </>
      )}
      {v.shape === "oval" && (
        <>
          <ellipse rx="62" ry="36" {...common} />
          <ellipse rx="57" ry="31.5" {...common} strokeWidth={0.8} />
          {text(0)}
        </>
      )}
    </g>
  );
}

export function Field({ x, y, label, value, size = 10.5 }: { x: number; y: number; label: string; value: string; size?: number }) {
  return (
    <g>
      <text x={x} y={y} fontSize="5.6" fill="#5b6b76" fontFamily={MONO}>{label}</text>
      <text x={x} y={y + size + 1} fontSize={size} fontWeight="700" fill="#14181c" fontFamily={MONO}>{value}</text>
    </g>
  );
}

/** Silhouette head and shoulders in a black and white striped shirt. */
export function Holder({ x, y, w, h, id, faint = false, stripe = "#121417", base = "#f4f4f0", bg = ["#dfe6ea", "#c6d0d6"], children }: { x: number; y: number; w: number; h: number; id: string; faint?: boolean; stripe?: string; base?: string; bg?: [string, string]; children?: React.ReactNode }) {
  const sx = w / 100;
  const sy = h / 128;
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`} opacity={faint ? 0.22 : 1}>
      <defs>
        <clipPath id={`${id}-shirt`}>
          <path d="M8 128 C10 100 26 90 50 88 C74 90 90 100 92 128 Z" />
        </clipPath>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="128" fill={faint ? "none" : `url(#${id}-bg)`} />
      {/* neck and head */}
      <path d="M41 70 L41 88 L59 88 L59 70 Z" fill="#2a2f35" />
      <ellipse cx="50" cy="50" rx="19" ry="24" fill="#2a2f35" />
      {/* shirt with stripes */}
      <g clipPath={`url(#${id}-shirt)`}>
        <rect x="0" y="86" width="100" height="42" fill={base} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={i * 14 + 2} y="86" width="7" height="42" fill={stripe} />
        ))}
      </g>
      <path d="M8 128 C10 100 26 90 50 88 C74 90 90 100 92 128" fill="none" stroke="#121417" strokeWidth="1.2" />
      <path d="M42 89 L50 98 L58 89" fill="none" stroke="#121417" strokeWidth="2" />
      {children}
      {!faint && <rect x="0.5" y="0.5" width="99" height="127" fill="none" stroke="#8b979f" strokeWidth="1" />}
    </g>
  );
}

export function Passport({ stamp, pEurope }: { stamp: string; pEurope?: number }) {
  const ink = STATUS_INK[stamp] ?? "#a8740a";
  const now = new Date();
  const mon = now.toLocaleString("en-GB", { month: "short", timeZone: "Europe/London" }).toUpperCase().slice(0, 3);
  const issued = `${String(now.getUTCDate()).padStart(2, "0")} ${mon} ${now.getUTCFullYear()}`;
  const season = `${now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()}`;
  const mrz1 = pad44("P<NUFCTOON<ARMY<<HOWAY<THE<LADS");
  const mrz2 = pad44(`HWTL18920<7GEO9212097<NEVER<<<SMB<NIL<<<<<<0${stamp === "Approved" ? 1 : 0}`);

  const leftLines = guilloche(14, 318, 20, 400, 26, 4, 0.3);
  const rightLines = guilloche(322, 626, 20, 400, 30, 3.5, 1.9);

  return (
    <figure className="relative mx-auto w-full max-w-[560px]">
      <svg viewBox="0 0 640 420" className="w-full drop-shadow-[0_22px_28px_rgba(0,0,0,.65)]" role="img" aria-label={`Toon Army passport. Stamps: Fairs Cup winners 1969, 4-1 v PSG, 3-2 v Barcelona, 3-2 at Feyenoord, 6-1 at Qarabag, Milan, 4-0 at Union SG. This season: ${stamp}.`}>
        <defs>
          <linearGradient id="pp-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3ede0" />
            <stop offset="1" stopColor="#e4dccb" />
          </linearGradient>
          <linearGradient id="pp-right" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#eef2f1" />
            <stop offset=".55" stopColor="#e3ebe9" />
            <stop offset="1" stopColor="#d9e1e4" />
          </linearGradient>
          <linearGradient id="pp-spine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset=".45" stopColor="#000" stopOpacity=".28" />
            <stop offset=".5" stopColor="#000" stopOpacity=".42" />
            <stop offset=".55" stopColor="#000" stopOpacity=".28" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <path id="pp-ring-top" d="M -46 0 A 46 46 0 0 1 46 0" />
          <path id="pp-ring-bot" d="M -50 0 A 50 50 0 0 0 50 0" />
        </defs>

        {/* cover, peeking out round the pages */}
        <rect x="0" y="0" width="640" height="420" rx="18" fill="#101214" />
        <rect x="3" y="3" width="634" height="414" rx="16" fill="none" stroke="#2b3036" strokeWidth="2" />

        {/* ===== LEFT PAGE: VISAS ===== */}
        <rect x="14" y="14" width="304" height="392" rx="6" fill="url(#pp-left)" />
        <g stroke="#b9a98a" strokeOpacity=".28" strokeWidth=".6" fill="none">
          {leftLines.map((d, i) => <path key={i} d={d} />)}
        </g>
        <path d={rosette(166, 210, 70, 18, 9)} fill="none" stroke="#b9a98a" strokeOpacity=".3" strokeWidth=".7" />
        <path d={rosette(166, 210, 48, 12, 7)} fill="none" stroke="#b9a98a" strokeOpacity=".3" strokeWidth=".7" />
        <text x="30" y="34" fontSize="7" letterSpacing="3" fill="#8a7a5c" fontFamily={MONO}>VISAS · EUROPEAN NIGHTS</text>
        <text x="302" y="34" textAnchor="end" fontSize="7" fill="#8a7a5c" fontFamily={MONO}>4</text>

        {VISAS.map((v) => <Visa key={v.city} v={v} />)}

        {/* this season's stamp, from the real odds */}
        <g transform="translate(78 334) rotate(-13) scale(.82)" fontFamily={MONO} fill={ink}>
          <circle r="62" fill="none" stroke={ink} strokeWidth="3.4" />
          <circle r="56" fill="none" stroke={ink} strokeWidth="1" />
          <circle r="36" fill="none" stroke={ink} strokeWidth="1" />
          <text fontSize="8.5" fontWeight="700" letterSpacing="2.4">
            <textPath href="#pp-ring-top" startOffset="50%" textAnchor="middle">EUROPE {season}</textPath>
          </text>
          <text fontSize="8.5" fontWeight="700" letterSpacing="2.4">
            <textPath href="#pp-ring-bot" startOffset="50%" textAnchor="middle">TOON ARMY · HWTL</textPath>
          </text>
          <text y={stamp === "Next year" ? -2 : 6} textAnchor="middle" fontSize={stamp === "Next year" ? 15 : 17} fontWeight="900" fontFamily={DISPLAY}>
            {stamp === "Next year" ? "NEXT" : stamp.toUpperCase()}
          </text>
          {stamp === "Next year" && <text y="14" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily={DISPLAY}>YEAR</text>}
          {pEurope !== undefined && <text y="26" textAnchor="middle" fontSize="7" fontWeight="700">{Math.round(pEurope * 100)}% CHANCE</text>}
        </g>

        {/* ===== RIGHT PAGE: DATA PAGE ===== */}
        <rect x="322" y="14" width="304" height="392" rx="6" fill="url(#pp-right)" />
        <g stroke="#7f9ea3" strokeOpacity=".22" strokeWidth=".55" fill="none">
          {rightLines.map((d, i) => <path key={i} d={d} />)}
        </g>
        <path d={rosette(560, 210, 54, 22, 8)} fill="none" stroke="#7f9ea3" strokeOpacity=".3" strokeWidth=".7" />
        <path d={rosette(560, 210, 34, 14, 6)} fill="none" stroke="#7f9ea3" strokeOpacity=".3" strokeWidth=".7" />

        {/* header band */}
        <rect x="322" y="14" width="304" height="40" rx="6" fill="#14181c" />
        <rect x="322" y="40" width="304" height="14" fill="#14181c" />
        <text x="336" y="31" fontSize="6.5" letterSpacing="2.2" fill="#c9d1d6" fontFamily={MONO}>REPUBLIC OF TYNESIDE · TOON ARMY</text>
        <text x="336" y="47" fontSize="13" fontWeight="900" letterSpacing="1" fill="#f4f4f0" fontFamily={DISPLAY} textLength="276" lengthAdjust="spacingAndGlyphs">PASSPORT · PASSEPORT · PASSAPORTO</text>

        {/* photo, plus the faint ghost copy like a real data page */}
        <Holder x={336} y={68} w={92} h={118} id="pp-photo" />
        <Holder x={556} y={252} w={46} h={59} id="pp-ghost" faint />

        {/* fields */}
        <Field x={442} y={72} label="Type" value="P" size={9} />
        <Field x={482} y={72} label="Code" value="NUFC" size={9} />
        <Field x={530} y={72} label="Passport No." value="HWTL1892" size={9} />
        <Field x={442} y={98} label="Surname / Nom" value="TOON ARMY" />
        <Field x={442} y={124} label="Given names / Prénoms" value="HOWAY THE LADS" />
        <Field x={442} y={150} label="Nationality / Nationalité" value="GEORDIE" />
        <Field x={442} y={176} label="Date of birth / Date de naissance" value="09 DEC 1892" size={9.5} />
        <Field x={442} y={200} label="Place of birth / Lieu de naissance" value="ST JAMES' PARK" size={9.5} />
        <Field x={336} y={202} label="Sex / Sexe" value="UTM" size={9} />
        <Field x={336} y={226} label="Date of issue / Date de délivrance" value={issued} size={9.5} />
        <Field x={470} y={226} label="Authority / Autorité" value="GALLOWGATE" size={9.5} />
        <Field x={336} y={250} label="Date of expiry / Date d'expiration" value="NEVER" size={9.5} />
        <Field x={470} y={250} label="Not valid for / Non valable" value="WEARSIDE" size={9.5} />

        {/* signature */}
        <text x="336" y="284" fontSize="5.6" fill="#5b6b76" fontFamily={MONO}>Holder&apos;s signature / Signature du titulaire</text>
        <text x="340" y="306" fontSize="20" fill="#1c2a6b" fontFamily={SERIF} fontStyle="italic" transform="rotate(-3 340 306)">Howay the lads</text>
        <path d="M338 312 L520 308" stroke="#9aa6ad" strokeWidth=".6" />

        {/* machine readable zone */}
        <rect x="322" y="330" width="304" height="76" fill="#f6f8f7" />
        <path d="M322 330 L626 330" stroke="#c8d2d6" strokeWidth="1" />
        <text x="332" y="360" fontSize="11.2" fontFamily={MONO} fill="#1a1d20" letterSpacing=".25" textLength="284" lengthAdjust="spacingAndGlyphs">{mrz1}</text>
        <text x="332" y="384" fontSize="11.2" fontFamily={MONO} fill="#1a1d20" letterSpacing=".25" textLength="284" lengthAdjust="spacingAndGlyphs">{mrz2}</text>

        {/* page edge and spine shadow */}
        <rect x="300" y="14" width="40" height="392" fill="url(#pp-spine)" />
        <path d="M320 14 L320 406" stroke="#000" strokeOpacity=".35" strokeWidth="1" />
      </svg>
      <figcaption className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-chalk/75">
        {pEurope !== undefined ? `Chance of Europe: ${Math.round(pEurope * 100)}% · ` : ""}Champions League nights only. Howay the lads.
      </figcaption>
    </figure>
  );
}
