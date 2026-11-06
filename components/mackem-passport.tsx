import { milanLine } from "@/lib/voice";
import { DISPLAY, Field, Holder, MONO, SERIF, guilloche } from "./passport";

/**
 * The Mackem passport. Grubby, stained, dog-eared. Every trip leaves from Newcastle Airport,
 * because Sunderland hasn't got one (Newcastle Airport even laid on extra flights for their
 * Europa League away days). Results are real; future trips only get stamped once the date has passed.
 */

type Trip = { city: string; date: string; iso: string; score?: string; note: string; x: number; y: number; rot: number; ink: string };

const TRIPS: Trip[] = [
  { city: "LEIRIA", date: "15 OCT 2026", iso: "2026-10-15", score: "TORREENSE 1-2 SUN", note: "PORTUGUESE 2ND DIV", x: 28, y: 50, rot: -7, ink: "#6b4a2b" },
  { city: "POZNAŃ", date: "22 OCT 2026", iso: "2026-10-22", score: "LECH 1-1 SUN", note: "COULDN'T BEAT LECH", x: 168, y: 64, rot: 6, ink: "#4f5a3a" },
  { city: "MILANO", date: "10 DEC 2026", iso: "2026-12-10", note: "THURSDAY NIGHT", x: 40, y: 168, rot: 4, ink: "#7a2e22" },
  { city: "BRUXELLES", date: "21 JAN 2027", iso: "2027-01-21", note: "THURSDAY NIGHT", x: 170, y: 176, rot: -5, ink: "#3e4d5c" },
];

function TripStamp({ t, done }: { t: Trip; done: boolean }) {
  return (
    <g transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`} fontFamily={MONO} fill={t.ink} opacity={done ? 0.8 : 0.45}>
      <rect x="0" y="0" width="118" height="78" rx="3" fill="none" stroke={t.ink} strokeWidth="2" strokeDasharray={done ? undefined : "5 4"} />
      <text x="59" y="16" textAnchor="middle" fontSize="12.5" fontWeight="700" fontFamily={DISPLAY} letterSpacing="1">{t.city}</text>
      <text x="59" y="27" textAnchor="middle" fontSize="6">{t.date}</text>
      <text x="59" y="38" textAnchor="middle" fontSize="7" fontWeight="700">{done ? t.score ?? "ARRIVED" : "NOT YET"}</text>
      <text x="59" y="47" textAnchor="middle" fontSize="5.6">{t.note}</text>
      <line x1="6" y1="53" x2="112" y2="53" stroke={t.ink} strokeWidth=".7" />
      <text x="59" y="63" textAnchor="middle" fontSize="6.4" fontWeight="700">DEP: NEWCASTLE (NCL)</text>
      <text x="59" y="72" textAnchor="middle" fontSize="5">NO AIRPORT ON WEARSIDE</text>
    </g>
  );
}

/** Brown splodges, coffee rings and muck. */
function Grime({ x, y, w, h, id, mirror = false }: { x: number; y: number; w: number; h: number; id: string; mirror?: boolean }) {
  const X = (f: number) => x + w * (mirror ? 1 - f : f);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} filter={`url(#${id}-dirt)`} opacity=".55" />
      {/* coffee rings */}
      <circle cx={X(0.78)} cy={y + h * 0.82} r="26" fill="none" stroke="#6b4422" strokeOpacity=".32" strokeWidth="3.5" />
      <circle cx={X(0.8)} cy={y + h * 0.83} r="23" fill="none" stroke="#6b4422" strokeOpacity=".14" strokeWidth="6" />
      {/* the brown stuff */}
      <g filter={`url(#${id}-blob)`} fill="#5a3a17">
        <ellipse cx={X(0.16)} cy={y + h * 0.9} rx="22" ry="12" opacity=".55" />
        <ellipse cx={X(0.24)} cy={y + h * 0.86} rx="9" ry="6" opacity=".45" />
        <ellipse cx={X(0.88)} cy={y + h * 0.12} rx="14" ry="9" opacity=".45" />
        <ellipse cx={X(0.52)} cy={y + h * 0.48} rx="7" ry="5" opacity=".3" />
      </g>
      {/* smudged thumbprint */}
      <g fill="none" stroke="#3b2a18" strokeOpacity=".18" strokeWidth=".8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ellipse key={i} cx={X(0.62)} cy={y + h * 0.18} rx={4 + i * 2.2} ry={5.5 + i * 2.6} transform={`rotate(-20 ${X(0.62)} ${y + h * 0.18})`} />
        ))}
      </g>
    </g>
  );
}

function Fly({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse cx="-3" cy="-2.5" rx="3.2" ry="1.8" fill="#c9d3d8" opacity=".75" transform="rotate(-30)" />
      <ellipse cx="3" cy="-2.5" rx="3.2" ry="1.8" fill="#c9d3d8" opacity=".75" transform="rotate(30)" />
      <ellipse cx="0" cy="0" rx="1.8" ry="3" fill="#15181a" />
      <circle cx="0" cy="-3" r="1.4" fill="#15181a" />
    </g>
  );
}

export function MackemPassport({ now = new Date() }: { now?: Date }) {
  const today = now.toISOString().slice(0, 10);
  const mrz1 = ("P<SMBMACKEM<<SAD<BASTARD" + "<".repeat(44)).slice(0, 44);
  const mrz2 = ("SMB1879<<0<NO<AIRPORT<<FLIES<NCL<<THURSDAYS" + "<".repeat(44)).slice(0, 43) + "0";
  const leftLines = guilloche(14, 318, 20, 400, 22, 4, 2.4);
  const rightLines = guilloche(322, 626, 20, 400, 26, 3.5, 0.9);

  return (
    <figure className="relative mx-auto w-full max-w-[560px]">
      <svg viewBox="0 0 640 420" className="w-full drop-shadow-[0_22px_28px_rgba(0,0,0,.65)]" role="img" aria-label="A grubby, stained Mackem passport. Every departure stamped Newcastle Airport, because Sunderland hasn't got one.">
        <defs>
          <filter id="mp-dirt" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7" />
            <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .2  0 0 0 0 .08  0 0 0 .55 -.18" />
          </filter>
          <filter id="mp-blob" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="turbulence" baseFrequency=".08" numOctaves="2" seed="3" result="t" />
            <feDisplacementMap in="SourceGraphic" in2="t" scale="14" />
            <feGaussianBlur stdDeviation=".6" />
          </filter>
          <linearGradient id="mp-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9c99f" />
            <stop offset=".6" stopColor="#cdb987" />
            <stop offset="1" stopColor="#b9a06b" />
          </linearGradient>
          <linearGradient id="mp-right" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ddd1ad" />
            <stop offset="1" stopColor="#c3ae7c" />
          </linearGradient>
          <linearGradient id="mp-spine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset=".5" stopColor="#2a1a08" stopOpacity=".5" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* scuffed red cover */}
        <rect x="0" y="0" width="640" height="420" rx="18" fill="#4a1512" />
        <rect x="0" y="0" width="640" height="420" rx="18" filter="url(#mp-dirt)" opacity=".7" />
        <rect x="3" y="3" width="634" height="414" rx="16" fill="none" stroke="#2a0b09" strokeWidth="2" />

        {/* ===== LEFT PAGE: every trip, via Newcastle ===== */}
        <path d="M14 20 Q14 14 20 14 L312 14 Q318 14 318 20 L318 398 L300 406 L282 400 L262 406 L240 401 L20 406 Q14 406 14 400 Z" fill="url(#mp-left)" />
        <g stroke="#8a7346" strokeOpacity=".25" strokeWidth=".6" fill="none">
          {leftLines.map((d, i) => <path key={i} d={d} />)}
        </g>
        <text x="30" y="34" fontSize="7" letterSpacing="3" fill="#6d5a36" fontFamily={MONO}>VISAS · THURSDAY NIGHTS</text>
        <text x="302" y="34" textAnchor="end" fontSize="7" fill="#6d5a36" fontFamily={MONO}>1</text>

        {TRIPS.map((t) => <TripStamp key={t.city} t={t} done={today >= t.iso} />)}

        {/* the big one: Newcastle Airport, in wor black and white */}
        <g transform="translate(168 308) rotate(-11) scale(.9)" fontFamily={MONO} fill="#141414">
          <circle r="60" fill="#f2efe6" fillOpacity=".35" stroke="#141414" strokeWidth="3.2" />
          <circle r="54" fill="none" stroke="#141414" strokeWidth="1" />
          <text y="-30" textAnchor="middle" fontSize="7.5" fontWeight="700" letterSpacing="1.5">DEPARTURES</text>
          <text y="-4" textAnchor="middle" fontSize="27" fontWeight="900" fontFamily={DISPLAY}>NCL</text>
          <text y="10" textAnchor="middle" fontSize="7.4" fontWeight="700">NEWCASTLE AIRPORT</text>
          <text y="22" textAnchor="middle" fontSize="5.8">EVERY. SINGLE. TRIP.</text>
          <text y="35" textAnchor="middle" fontSize="5.8" fontWeight="700">SAY TA, MACKEMS</text>
        </g>

        <g transform="translate(30 392) rotate(-2)" fontFamily={SERIF} fontStyle="italic">
          <text x="0" y="0" fontSize="10.5" fill="#7a2e22" fontWeight="600">Every trip starts in Newcastle. HAHAHA</text>
        </g>

        <Grime x={14} y={14} w={304} h={392} id="mp" mirror />
        <Fly x={248} y={352} r={20} />

        {/* ===== RIGHT PAGE: data page ===== */}
        <path d="M322 14 L620 14 Q626 14 626 20 L626 386 L600 406 L328 406 Q322 406 322 400 Z" fill="url(#mp-right)" />
        <g stroke="#8a7346" strokeOpacity=".22" strokeWidth=".55" fill="none">
          {rightLines.map((d, i) => <path key={i} d={d} />)}
        </g>
        {/* dog-eared corner */}
        <path d="M626 386 L600 406 L606 388 Z" fill="#9c8656" />

        <rect x="322" y="14" width="304" height="40" rx="6" fill="#5e1814" />
        <rect x="322" y="40" width="304" height="14" fill="#5e1814" />
        <text x="336" y="31" fontSize="6.5" letterSpacing="2.2" fill="#e3c9b8" fontFamily={MONO}>WEARSIDE · NO AIRPORT · SEE NEWCASTLE</text>
        <text x="336" y="47" fontSize="13" fontWeight="900" letterSpacing="1" fill="#f1e6d6" fontFamily={DISPLAY} textLength="276" lengthAdjust="spacingAndGlyphs">PASSPORT · CHEAP · NOT VALID IN THE TOON</text>

        <Holder x={336} y={68} w={92} h={118} id="mp-photo" stripe="#b3261e" base="#efe7d8" bg={["#cbbf9e", "#b4a57d"]}>
          {/* tears */}
          <path d="M42 50 q-3 9 0 13 q3 -4 0 -13 Z" fill="#7fb8e0" />
          <path d="M58 50 q-3 9 0 13 q3 -4 0 -13 Z" fill="#7fb8e0" />
          <path d="M40 66 q-2 6 0 8 q2 -2 0 -8 Z" fill="#7fb8e0" opacity=".8" />
        </Holder>

        <Field x={442} y={72} label="Type" value="P" size={9} />
        <Field x={482} y={72} label="Code" value="SMB" size={9} />
        <Field x={530} y={72} label="Passport No." value="SMB1879" size={9} />
        <Field x={442} y={98} label="Surname / Nom" value="MACKEM" />
        <Field x={442} y={124} label="Given names / Prénoms" value="SAD BASTARD" />
        <Field x={442} y={150} label="Nationality / Nationalité" value="WEARSIDE" />
        <Field x={442} y={176} label="Nearest airport" value="NEWCASTLE (NCL)" size={9.5} />
        <Field x={442} y={200} label="Own airport" value="NONE. HAHAHA" size={9.5} />
        <Field x={336} y={202} label="Previous trip" value="1973" size={9} />
        <Field x={336} y={226} label="Home ground" value="STADIUM OF SHITE" size={9.5} />
        <Field x={490} y={226} label="Plays on" value="THURSDAYS" size={9.5} />
        <Field x={336} y={250} label="Date of expiry" value="MAY. PROBABLY" size={9.5} />
        <Field x={490} y={250} label="Champions League" value="NEVER" size={9.5} />

        <text x="336" y="284" fontSize="5.6" fill="#6d5a36" fontFamily={MONO}>Holder&apos;s signature (spelt wrong)</text>
        <text x="342" y="306" fontSize="19" fill="#2a2a2a" fontFamily={SERIF} fontStyle="italic" transform="rotate(4 342 306)">Haway</text>
        <path d="M338 312 L470 309" stroke="#8a7a5a" strokeWidth=".6" />

        <rect x="322" y="330" width="304" height="76" fill="#e2d6b4" />
        <text x="332" y="360" fontSize="11.2" fontFamily={MONO} fill="#2a241a" textLength="284" lengthAdjust="spacingAndGlyphs">{mrz1}</text>
        <text x="332" y="384" fontSize="11.2" fontFamily={MONO} fill="#2a241a" textLength="284" lengthAdjust="spacingAndGlyphs">{mrz2}</text>

        <Grime x={322} y={14} w={304} h={392} id="mp" />
        <Fly x={400} y={140} r={-35} />
        <Fly x={590} y={60} r={60} />

        <rect x="300" y="14" width="40" height="392" fill="url(#mp-spine)" />
        <path d="M320 14 L320 406" stroke="#000" strokeOpacity=".45" strokeWidth="1" />
      </svg>
      <figcaption className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-chalk/75">
{milanLine(now)}
      </figcaption>
    </figure>
  );
}
