import Link from "next/link";
import type { Meter } from "@/lib/meter";

function Bar({ m }: { m: Meter }) {
  // One block per sign we could measure; red ones are bad for them.
  const order = [...m.signs].sort((a, b) => Number(b.bad) - Number(a.bad));
  return (
    <div className="meter" style={{ ["--n" as string]: Math.max(1, m.total) }} aria-label={`${m.bad} of ${m.total} bad signs`}>
      {order.map((s) => (
        <span key={s.key} className={s.bad ? "on" : ""} />
      ))}
    </div>
  );
}

/** Homepage version: the verdict and the numbers, nowt else. */
export function MeterCompact({ m }: { m: Meter }) {
  return (
    <section className="panel panel-top mackem p-5 sm:p-6" aria-labelledby="meter-h">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="meter-h" className="kicker !text-mackem">The Mackem Misery Meter</h2>
        <span className="font-mono text-xs text-silver">{m.bad}/{m.total} bad signs</span>
      </div>
      <p className="tabloid mt-2 text-5xl sm:text-6xl">{m.levelName}</p>
      <div className="mt-4"><Bar m={m} /></div>
      <p className="serif mt-4 text-lg leading-snug text-mist">{m.verdict}</p>
      <dl className="mt-5 grid gap-2 border-t border-[var(--line)] pt-4">
        {m.signs.filter((s) => s.key !== "derby").slice(0, 4).map((s) => (
          <div key={s.key} className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-silver">{s.label}</dt>
            <dd className={`scoreboard-num text-lg ${s.bad ? "text-mackem" : "text-chalk"}`}>
              {s.key === "form" ? (
                <span className="inline-flex gap-[3px]">{m.form.map((r, i) => <span key={i} className={`form-pip mackem ${r}`}>{r}</span>)}</span>
              ) : (
                s.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <Link href="/mackem-watch" className="display mt-5 inline-block text-base text-silver underline-offset-4 hover:text-chalk hover:underline">
        The full state of them →
      </Link>
    </section>
  );
}

/** Mackem Watch version: every sign, what it means, and how it's judged. */
export function MeterFull({ m }: { m: Meter }) {
  return (
    <section className="panel panel-top mackem p-5 sm:p-8">
      <div className="kicker !text-mackem">The Mackem Misery Meter</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="tabloid text-6xl sm:text-7xl">{m.levelName}</p>
        <p className="font-mono text-sm text-silver">{m.bad} of {m.total} bad signs</p>
      </div>
      <div className="mt-4"><Bar m={m} /></div>
      <p className="serif mt-4 max-w-2xl text-xl leading-snug text-mist">{m.summary}</p>
      <ul className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {m.signs.map((s) => (
          <li key={s.key} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-baseline sm:gap-4">
            <span className="text-sm text-silver">{s.label}</span>
            <span className="text-mist">{s.line}</span>
            <span className={`scoreboard-num text-lg ${s.bad ? "text-mackem" : "text-chalk"}`}>{s.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-silver">
        Bad sign = bottom three · one win or fewer in the last five · conceding two a game · two or more defeats on the trot (or four without a win) · lost the last derby · last home crowd under 90% full. Anything we can&apos;t measure is left off. <Link href="/how-it-works" className="underline">More</Link>
      </p>
    </section>
  );
}
