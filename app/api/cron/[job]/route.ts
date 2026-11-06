import { NextResponse, type NextRequest } from "next/server";
import { authorisedCron, unauthorised } from "@/lib/automation";
import { JOBS, runNamedJob, type JobName } from "@/lib/jobs";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron calls these with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  if (!authorisedCron(req)) return unauthorised();
  const { job } = await params;
  if (!JOBS.includes(job as JobName)) return NextResponse.json({ error: "unknown job" }, { status: 404 });
  const force = req.nextUrl.searchParams.get("force") === "1";
  const result = await runNamedJob(job as JobName, force);
  revalidatePath("/", "layout");
  return NextResponse.json(result, { status: result?.ok ? 200 : 500 });
}
