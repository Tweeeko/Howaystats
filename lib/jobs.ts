import "server-only";
import { runJob } from "./automation";
import { syncFootball, syncLive } from "./football/sync";
import { runPredictions } from "./predictions/run";
import { runMisery } from "./misery/run";
import { discoverNews } from "./news/discover";
import { discoverMemes } from "./memes/discover";
import { generateBanter } from "./banter/generate";
import { adminDb } from "./database/client";

export const JOBS = ["football", "live", "predictions", "misery", "news", "memes", "banter", "cleanup", "daily"] as const;
export type JobName = (typeof JOBS)[number];

async function cleanup() {
  const db = adminDb();
  const cutoff = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const [logs, rejectedNews, rejectedMemes, pendingMemes, oldRuns] = await Promise.all([
    db.from("automation_logs").delete().lt("started_at", cutoff(30)),
    db.from("news_articles").delete().eq("status", "rejected").lt("created_at", cutoff(14)),
    db.from("memes").delete().eq("status", "rejected").lt("discovered_at", cutoff(14)),
    db.from("memes").delete().eq("status", "pending").lt("discovered_at", cutoff(30)),
    db.from("rate_limits").delete().lt("window_start", cutoff(1)),
  ]);
  // Keep model history (needed for the odds trend) but thin intra-day snapshots older than 60 days.
  const errors = [logs, rejectedNews, rejectedMemes, pendingMemes, oldRuns].map((r) => r.error?.message).filter(Boolean);
  if (errors.length) throw new Error(errors.join("; "));
  return { cleaned: true };
}

/** After results change: re-model → misery → banter. Each step isolated. */
async function afterResults() {
  const p = await runJob("predictions", () => runPredictions());
  const m = await runJob("misery", runMisery);
  const b = await runJob("banter", generateBanter);
  return { predictions: p.ok, misery: m.ok, banter: b.ok };
}

export async function runNamedJob(name: JobName, force = false) {
  switch (name) {
    case "football": {
      const r = await runJob("football", syncFootball);
      if (r.ok && (r.result?.newlyFinished ?? 0) > 0) return { ...r, chained: await afterResults() };
      return r;
    }
    case "live": {
      const r = await runJob("live", syncLive);
      if (r.ok && (r.result?.finished ?? 0) > 0) return { ...r, chained: await afterResults() };
      return r;
    }
    case "predictions":
      return runJob("predictions", () => runPredictions(force));
    case "misery":
      return runJob("misery", runMisery);
    case "news":
      return runJob("news", discoverNews);
    case "memes":
      return runJob("memes", discoverMemes);
    case "banter":
      return runJob("banter", generateBanter);
    case "cleanup":
      return runJob("cleanup", cleanup);
    case "daily": {
      // One chained run for Vercel Hobby (daily crons only). A failure in one step never stops the next.
      const steps: Record<string, boolean> = {};
      steps.football = (await runJob("football", syncFootball)).ok;
      steps.predictions = (await runJob("predictions", () => runPredictions())).ok;
      steps.news = (await runJob("news", discoverNews)).ok;
      steps.misery = (await runJob("misery", runMisery)).ok;
      steps.memes = (await runJob("memes", discoverMemes)).ok;
      steps.banter = (await runJob("banter", generateBanter)).ok;
      steps.cleanup = (await runJob("cleanup", cleanup)).ok;
      return { ok: steps.football, result: steps };
    }
  }
}
