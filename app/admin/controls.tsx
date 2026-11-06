"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function post(body: unknown) {
  const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ ok: r.ok }));
}

export function AdminButton({ body, label, danger }: { body: unknown; label: string; danger?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        disabled={busy}
        className={`display border px-3 py-1 text-sm ${danger ? "border-mackem text-mackem hover:bg-mackem hover:text-chalk" : "border-[var(--line-strong)] hover:bg-chalk hover:text-ink"} disabled:opacity-50`}
        onClick={async () => {
          setBusy(true);
          const j = await post(body);
          setRes(j.ok === false || j.error ? "failed" : "done");
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? "…" : label}
      </button>
      {res && <span className={`font-mono text-[10px] ${res === "done" ? "text-pitch" : "text-mackem"}`}>{res}</span>}
    </span>
  );
}

export function EditNews({ id, headline, commentary, punchline = "", breaking }: { id: string; headline: string; commentary: string; punchline?: string; breaking: boolean }) {
  const [h, setH] = useState(headline);
  const [c, setC] = useState(commentary);
  const [pl, setPl] = useState(punchline);
  const [b, setB] = useState(breaking);
  const [saved, setSaved] = useState(false);
  return (
    <div className="mt-2 grid gap-2">
      <input value={h} onChange={(e) => setH(e.target.value)} placeholder="HOWAYSTATS headline" className="border border-[var(--line-strong)] bg-black/60 px-2 py-1 font-bold uppercase" />
      <textarea value={c} onChange={(e) => setC(e.target.value)} rows={2} placeholder="The take (facts must match the original)" className="border border-[var(--line-strong)] bg-black/60 px-2 py-1 text-sm" />
      <input value={pl} onChange={(e) => setPl(e.target.value)} placeholder="Punchline (one line, no invented quotes)" className="border border-[var(--line-strong)] bg-black/60 px-2 py-1 text-sm" />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={b} onChange={(e) => setB(e.target.checked)} />Breaking ribbon (only if genuinely justified)</label>
        <button className="display border border-[var(--line-strong)] px-3 py-1 text-sm hover:bg-chalk hover:text-ink" onClick={async () => { await post({ action: "edit-news", id, howay_headline: h, howay_commentary: c, howay_punchline: pl, breaking: b }); setSaved(true); }}>Save copy</button>
        {saved && <span className="font-mono text-[10px] text-pitch">saved</span>}
      </div>
    </div>
  );
}

export function EditBanter({ id, text, status, meta }: { id: string; text: string; status: string; meta: string }) {
  const [t, setT] = useState(text);
  const [st, setSt] = useState(status);
  return (
    <div className="panel p-3">
      <div className="font-mono text-[10px] uppercase text-silver">{meta} · {st}</div>
      <textarea value={t} onChange={(e) => setT(e.target.value)} rows={2} className="mt-1 w-full border border-[var(--line-strong)] bg-black/60 px-2 py-1 text-sm" />
      <div className="mt-1 flex gap-2">
        <button className="display border border-[var(--line-strong)] px-2 py-0.5 text-sm" onClick={() => post({ action: "edit-banter", id, text: t })}>Save</button>
        <button className="display border border-mackem px-2 py-0.5 text-sm text-mackem" onClick={async () => { const next = st === "hidden" ? "published" : "hidden"; await post({ action: "edit-banter", id, status: next }); setSt(next); }}>{st === "hidden" ? "Unhide" : "Hide"}</button>
      </div>
    </div>
  );
}
