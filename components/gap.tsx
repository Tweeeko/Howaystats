/**
 * The only table that matters: Newcastle v Sunderland, right at the top.
 * Points, goal difference, position and form, each spelled out, each with a line.
 */
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const gd = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export interface GapSide {
  points: number;
  position: number;
  played: number;
  goalDifference: number;
  form: ("W" | "D" | "L")[];
}

export function gapLines(n: GapSide, s: GapSide, leagueSize: number) {
  const pts = n.points - s.points;
  const gdGap = n.goalDifference - s.goalDifference;
  const headline =
    pts > 9
      ? `${pts} points clear. Natural order.`
      : pts > 0
        ? `${pts} point${pts === 1 ? "" : "s"} clear of them. As it should be.`
        : pts === 0
          ? gdGap > 0
            ? "Level on points. Ahead on goal difference. Still counts."
            : "Level on points. Unacceptable."
          : `They're ${-pts} ahead. Temporary. Has to be.`;
  const toon = [
    n.position < s.position ? "Top of the North East. UTM." : "Biding wor time.",
    gdGap > 0 ? `Goal difference ${gdGap} better than theirs.` : "Goal difference is just a number.",
  ];
  const sunWins = s.form.filter((r) => r === "W").length;
  const mackems = [
    s.position === leagueSize ? "Bottom of the league. Sad Mackem bastards." : s.position > leagueSize - 3 ? "Bottom three. Pack your bags." : s.position > n.position ? "Below us. Where they belong." : "Above us. Clerical error.",
    s.goalDifference <= -8
      ? `Goal difference ${gd(s.goalDifference)}. Shipping them like they're on offer.`
      : s.goalDifference < 0
        ? `Goal difference ${gd(s.goalDifference)}. Leaky.`
        : `Goal difference ${gd(s.goalDifference)}. Fluke.`,
    s.form.length ? (sunWins === 0 ? `No wins in their last ${s.form.length}.` : `${sunWins} win${sunWins === 1 ? "" : "s"} in their last ${s.form.length}.`) : "",
  ].filter(Boolean);
  return { headline, toon, mackems };
}

function Side({ name, side, lines, mackem }: { name: string; side: GapSide; lines: string[]; mackem?: boolean }) {
  return (
    <div className={`${mackem ? "stripes-bg-sun" : "stripes-bg-nufc"} px-4 py-6 sm:px-8 sm:py-8`}>
      <div className="display text-2xl text-chalk sm:text-4xl">{name}</div>
      <div className="mt-2 flex items-end gap-3">
        <span className="tabloid text-[clamp(4.5rem,18vw,9rem)] leading-[.82] text-chalk drop-shadow-[0_5px_0_rgba(0,0,0,.6)]">{side.points}</span>
        <span className="display pb-2 text-2xl text-chalk sm:text-4xl">Points</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t-2 border-chalk/60 pt-3 text-chalk">
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-chalk/80 sm:text-xs">Goal difference</dt>
          <dd className="tabloid text-3xl sm:text-4xl">{gd(side.goalDifference)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-chalk/80 sm:text-xs">League position</dt>
          <dd className="tabloid text-3xl sm:text-4xl">{ord(side.position)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-chalk/80 sm:text-xs">Last {side.form.length} games</dt>
          <dd className="mt-1 inline-flex gap-[3px]">
            {side.form.map((r, i) => (
              <span key={i} className={`form-pip ${mackem ? "mackem" : ""} ${r}`}>{r}</span>
            ))}
          </dd>
        </div>
      </dl>
      <ul className="mt-3 space-y-1">
        {lines.map((l) => (
          <li key={l} className="text-sm font-bold text-chalk sm:text-base">{l}</li>
        ))}
      </ul>
    </div>
  );
}

export function TheGap({ nufc, sun, leagueSize, nextDerby }: { nufc: GapSide; sun: GapSide; leagueSize: number; nextDerby?: string | null }) {
  const g = gapLines(nufc, sun, leagueSize);
  const pts = nufc.points - sun.points;
  return (
    <section aria-label="Newcastle v Sunderland" className="border-b-4 border-chalk">
      <div className="bg-chalk px-4 py-3 text-center text-ink">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[.25em]">The only table that matters</div>
        <p className="tabloid mt-1 text-[clamp(1.6rem,5vw,2.8rem)]">{g.headline}</p>
      </div>
      <div className="relative grid sm:grid-cols-2">
        <Side name="Newcastle" side={nufc} lines={g.toon} />
        <Side name="Sunderland" side={sun} lines={g.mackems} mackem />
        <div className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 sm:block">
          <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-chalk bg-ink text-center shadow-[0_10px_30px_rgba(0,0,0,.6)]">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-silver">Gap</div>
              <div className={`tabloid text-4xl leading-none ${pts >= 0 ? "text-chalk" : "text-mackem"}`}>{pts > 0 ? `+${pts}` : pts}</div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-silver">points</div>
            </div>
          </div>
        </div>
      </div>
      {nextDerby && (
        <div className="bg-ink px-4 py-2 text-center font-mono text-xs font-bold uppercase tracking-wider text-chalk">Next derby: {nextDerby}</div>
      )}
    </section>
  );
}
