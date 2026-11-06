import { pick } from "@/lib/voice";

/** The line between the Mackem bit and the Toon bit. Rotates daily; minds how wor lads got on. */
export const HANDOVER_LINES = {
  any: [
    { kicker: "That's enough of them sad Mackem bastards", line: "And now, the lads who actually play football." },
    { kicker: "Leaving Wearside", line: "Mind the tears on your way out. Fuck the Mackems." },
    { kicker: "Twelve miles up the road", line: "Meanwhile, a proper football club." },
    { kicker: "Now crossing the Tyne", line: "Standards rising. Mind your ears." },
    { kicker: "Right, enough of that shite", line: "Here's the greatest club in the world." },
    { kicker: "From the Stadium of Shite", line: "To the Cathedral on the Hill." },
    { kicker: "They get Thursday nights", line: "We get Champions League nights. Here's how it's done." },
  ],
  afterDefeat: [
    { kicker: "Right, enough about them", line: "Wor lads. Bad day at the office. Still miles better." },
    { kicker: "Now crossing the Tyne", line: "We got beat. Fuck it. At least we're not Mackems." },
  ],
  afterWin: [
    { kicker: "That's enough of that", line: "And now, some winners. Howay the lads." },
    { kicker: "Twelve miles up the road", line: "Three points. Obviously. Here's how it's done." },
  ],
};

export function handoverLine(seed: string, nufcLast: "W" | "D" | "L" | null) {
  const pool = nufcLast === "L" ? [...HANDOVER_LINES.afterDefeat, ...HANDOVER_LINES.any] : nufcLast === "W" ? [...HANDOVER_LINES.afterWin, ...HANDOVER_LINES.any] : HANDOVER_LINES.any;
  return pick(pool, seed, "handover");
}

export function Handover({ seed, nufcLast }: { seed: string; nufcLast: "W" | "D" | "L" | null }) {
  const h = handoverLine(seed, nufcLast);
  return (
    <section aria-label="Over to the Toon" className="relative overflow-hidden">
      <div className="stripes-red h-3" />
      <div className="bg-[linear-gradient(180deg,#5a0b10_0%,#141414_55%,#050607_100%)] px-4 py-12 text-center sm:py-16">
        <div className="font-mono text-xs font-bold uppercase tracking-[.3em] text-chalk/75 sm:text-sm">{h.kicker}</div>
        <p className="tabloid mx-auto mt-3 max-w-4xl text-[clamp(2.4rem,8vw,5.2rem)] text-chalk drop-shadow-[0_5px_0_rgba(0,0,0,.6)]">{h.line}</p>
        <div className="mt-6 flex items-center justify-center gap-3 font-mono text-xs font-bold uppercase tracking-[.25em] text-chalk/70">
          <span className="h-px w-10 bg-chalk/40" />
          <span>The Toon ↓</span>
          <span className="h-px w-10 bg-chalk/40" />
        </div>
      </div>
      <div className="stripes h-4" />
    </section>
  );
}
