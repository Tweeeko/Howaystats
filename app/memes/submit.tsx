"use client";
import { useState } from "react";

export function SubmitMeme() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const field = "w-full border border-[var(--line-strong)] bg-black/60 px-3 py-2 text-sm text-chalk placeholder:text-silver focus:border-chalk focus:outline-none";
  return (
    <form
      className="panel panel-top grid gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/memes/submit", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)), headers: { "content-type": "application/json" } });
        const j = await res.json().catch(() => ({}));
        if (res.ok) {
          setState("done");
          setMsg("Ta. It's in the moderation queue.");
          (e.target as HTMLFormElement).reset();
        } else {
          setState("error");
          setMsg(j.error ?? "Something went wrong.");
        }
      }}
    >
      <label className="grid gap-1"><span className="kicker !text-[0.62rem]">Link to the meme (Reddit, X, Imgur…)</span><input required name="sourceUrl" type="url" className={field} placeholder="https://" /></label>
      <label className="grid gap-1"><span className="kicker !text-[0.62rem]">Direct image link (optional)</span><input name="mediaUrl" type="url" className={field} placeholder="https://…jpg" /></label>
      <label className="grid gap-1"><span className="kicker !text-[0.62rem]">Title</span><input required name="title" maxLength={140} className={field} /></label>
      <label className="grid gap-1"><span className="kicker !text-[0.62rem]">Credit as (optional)</span><input name="name" maxLength={40} className={field} placeholder="e.g. Gallowgate Gav" /></label>
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <label className="flex items-start gap-2 text-xs text-mist"><input required type="checkbox" name="rights" value="yes" className="mt-0.5" />I made this or it&apos;s shared publicly by its creator, and it doesn&apos;t target anyone&apos;s personal life or identity.</label>
      <button disabled={state === "sending"} className="display mt-1 bg-chalk px-4 py-2 text-xl text-ink transition hover:bg-mist disabled:opacity-50">{state === "sending" ? "Sending…" : "Submit for moderation"}</button>
      {msg && <p className={`text-sm ${state === "error" ? "text-mackem" : "text-pitch"}`} role="status">{msg}</p>}
    </form>
  );
}
