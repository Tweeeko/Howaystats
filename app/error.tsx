"use client";
import { EMPTY } from "@/lib/voice";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <div className="kicker !text-mackem">Var check</div>
      <h1 className="display-i mt-2 text-6xl">Absolute shambles.</h1>
      <p className="mt-3 text-mist">{EMPTY.error}</p>
      <button onClick={reset} className="display mt-6 bg-chalk px-5 py-2 text-xl text-ink">Gan on, try again</button>
    </div>
  );
}
