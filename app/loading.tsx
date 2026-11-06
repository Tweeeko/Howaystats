import { EMPTY } from "@/lib/voice";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16" aria-busy="true" aria-live="polite">
      <div className="kicker">{EMPTY.loading[0]}</div>
      <div className="mt-3 h-16 w-2/3 animate-pulse bg-steel" />
      <div className="mt-6 grid gap-2">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 animate-pulse bg-coal" />)}
      </div>
    </div>
  );
}
