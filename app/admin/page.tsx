import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/database/client";
import { env } from "@/lib/env";
import { ago } from "@/components/football";
import { SectionHead } from "@/components/stadium";
import { AdminButton, EditBanter, EditNews } from "./controls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Admin() {
  const email = await currentAdmin();
  if (!email) redirect("/admin/login");
  let db;
  try {
    db = adminDb();
  } catch {
    return <div className="mx-auto max-w-3xl px-4 py-16"><h1 className="display text-5xl">Admin</h1><p className="mt-4 text-mackem">SUPABASE_SERVICE_ROLE_KEY is not set on the server.</p></div>;
  }
  const [status, logs, news, memes, banter] = await Promise.all([
    db.from("data_status").select("*").order("key"),
    db.from("automation_logs").select("*").order("started_at", { ascending: false }).limit(40),
    db.from("news_articles").select("*").in("status", ["pending", "published"]).order("created_at", { ascending: false }).limit(30),
    db.from("memes").select("*").in("status", ["pending", "published"]).order("discovered_at", { ascending: false }).limit(30),
    db.from("banter").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  const config: [string, boolean][] = [
    ["FOOTBALL_API_KEY", !!env.footballApiKey()],
    ["SUPABASE_SERVICE_ROLE_KEY", !!env.supabaseServiceKey()],
    ["CRON_SECRET", !!env.cronSecret()],
    ["AI_API_KEY", !!env.aiApiKey()],
    ["NEWS_API_KEY (optional)", !!env.newsApiKey()],
    ["MEME_SOURCE_API_KEY (GIPHY)", !!env.giphyKey()],
    ["REDDIT_CLIENT_ID/SECRET", !!(env.redditClientId() && env.redditClientSecret())],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display-i text-6xl">Admin</h1>
        <span className="font-mono text-xs text-silver">Signed in as {email}</span>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <SectionHead title="API Health" />
          <table className="pl-table">
            <thead><tr><th className="l">Job</th><th>Last success</th><th>Last attempt</th><th className="l">Last error</th></tr></thead>
            <tbody>
              {(status.data ?? []).map((s) => (
                <tr key={s.key}><td className="l display text-lg">{s.key}</td><td>{ago(s.last_success_at)}</td><td>{ago(s.last_attempt_at)}</td><td className="l max-w-[240px] truncate text-xs text-mackem" title={s.last_error ?? ""}>{s.last_error ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["football", "live", "predictions", "misery", "news", "memes", "banter", "cleanup", "daily"] as const).map((j) => <AdminButton key={j} body={{ action: "run", job: j, force: j === "predictions" }} label={`Run ${j}`} />)}
          </div>
        </div>
        <div className="panel p-5">
          <SectionHead title="Configuration" />
          <ul className="grid gap-1 font-mono text-sm">
            {config.map(([k, ok]) => <li key={k} className="flex justify-between border-b border-[var(--line)] py-1"><span>{k}</span><span className={ok ? "text-pitch" : "text-mackem"}>{ok ? "set" : "missing"}</span></li>)}
          </ul>
          <p className="mt-3 text-xs text-silver">Keys are managed in Vercel → Project → Settings → Environment Variables. They are never sent to the browser.</p>
        </div>
      </section>

      <section className="mt-10">
        <SectionHead title="News Review" sub="Pending first" mackem />
        <div className="grid gap-3">
          {[...(news.data ?? [])].sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1)).map((n) => (
            <div key={n.id} className={`panel p-4 ${n.status === "pending" ? "panel-top mackem" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase text-silver"><span>{n.status}</span>·<span>{n.category}</span>·<span>{n.source}</span>·<a className="underline" href={n.url} target="_blank" rel="noreferrer">original</a></div>
              <p className="mt-1 text-sm text-mist">Original: {n.original_headline}</p>
              <p className="text-xs text-silver">{n.original_summary}</p>
              <EditNews id={n.id} headline={n.howay_headline ?? ""} commentary={n.howay_commentary ?? ""} punchline={n.howay_punchline ?? ""} breaking={n.breaking} />
              <div className="mt-2 flex gap-2">
                <AdminButton body={{ action: "moderate", table: "news_articles", id: n.id, status: "published" }} label="Approve" />
                <AdminButton body={{ action: "moderate", table: "news_articles", id: n.id, status: "rejected" }} label="Reject / remove" danger />
              </div>
            </div>
          ))}
          {!news.data?.length && <p className="text-silver">Nothing to review.</p>}
        </div>
      </section>

      <section className="mt-10">
        <SectionHead title="Meme Review" mackem />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(memes.data ?? []).map((m) => (
            <div key={m.id} className="panel p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.media_url && <img src={m.media_url} alt="" className="max-h-48 w-full object-contain" />}
              <p className="mt-2 text-sm">{m.title}</p>
              <p className="font-mono text-[10px] uppercase text-silver">{m.status} · {m.source} · <a className="underline" href={m.source_url} target="_blank" rel="noreferrer">source</a></p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AdminButton body={{ action: "moderate", table: "memes", id: m.id, status: "published" }} label="Approve" />
                <AdminButton body={{ action: "feature-meme", id: m.id }} label="Feature today" />
                <AdminButton body={{ action: "moderate", table: "memes", id: m.id, status: "rejected" }} label="Remove" danger />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHead title="Banter" />
          <div className="grid gap-2">{(banter.data ?? []).map((b) => <EditBanter key={b.id} id={b.id} text={b.text} status={b.status} meta={`${b.for_date} · ${b.kind} · ${b.generated_by}`} />)}</div>
        </div>
        <div>
          <SectionHead title="Automation Log" />
          <ul className="panel max-h-[600px] divide-y divide-[var(--line)] overflow-y-auto font-mono text-xs">
            {(logs.data ?? []).map((l) => (
              <li key={l.id} className="flex gap-3 px-3 py-1.5"><span className="text-silver">{ago(l.started_at)}</span><span className="w-20">{l.job}</span><span className={l.status === "error" ? "text-mackem" : "text-pitch"}>{l.status}</span><span className="truncate text-mist" title={l.message ?? ""}>{l.message}</span></li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
