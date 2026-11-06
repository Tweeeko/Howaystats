"use client";
import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="tabloid text-6xl">Admin</h1>
      <p className="mt-2 text-sm text-mist">Password only. It&apos;s the ADMIN_PASSWORD you set in Vercel.</p>
      <form
        className="panel panel-top mt-6 grid gap-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
          setBusy(false);
          if (r.ok) location.href = "/admin";
          else setErr(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't sign in.");
        }}
      >
        <label className="grid gap-1">
          <span className="kicker !text-[0.62rem]">Password</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="border border-[var(--line-strong)] bg-black/60 px-3 py-2" />
        </label>
        <button disabled={busy} className="display bg-chalk px-4 py-2 text-xl text-ink disabled:opacity-60">{busy ? "Checking…" : "Sign in"}</button>
        {err && <p className="text-sm text-mackem">{err}</p>}
      </form>
    </div>
  );
}
