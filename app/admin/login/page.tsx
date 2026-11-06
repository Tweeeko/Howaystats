"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="display-i text-6xl">Admin</h1>
      <p className="mt-2 text-sm text-mist">Authorised administrators only. We&apos;ll email you a one-time sign-in link.</p>
      <form
        className="panel panel-top mt-6 grid gap-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (!url || !key) {
            setState("error");
            setErr("Supabase isn't configured.");
            return;
          }
          const sb = createBrowserClient(url, key);
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/admin/auth/callback`, shouldCreateUser: false } });
          if (error) {
            setState("error");
            setErr(error.message);
          } else setState("sent");
        }}
      >
        <label className="grid gap-1">
          <span className="kicker !text-[0.62rem]">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="border border-[var(--line-strong)] bg-black/60 px-3 py-2" />
        </label>
        <button className="display bg-chalk px-4 py-2 text-xl text-ink">Send sign-in link</button>
        {state === "sent" && <p className="text-sm text-pitch">Check your inbox.</p>}
        {state === "error" && <p className="text-sm text-mackem">{err}</p>}
      </form>
    </div>
  );
}
