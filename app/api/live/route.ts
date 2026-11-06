import { NextResponse } from "next/server";
import { buildLivePayload, maybeRefreshLive } from "@/lib/live";

export const dynamic = "force-dynamic";

/** Public live endpoint. At most one provider poll per minute across all visitors, only during match windows. */
export async function GET() {
  let refreshed = false;
  try {
    refreshed = await maybeRefreshLive();
  } catch {
    /* never fail the read because the refresh failed */
  }
  const payload = await buildLivePayload(refreshed);
  return NextResponse.json(payload, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=30" } });
}
