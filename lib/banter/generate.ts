import "server-only";
import { adminDb } from "../database/client";
import { loadCupFixtures, loadSeason } from "../football/sync";
import { computeStandings, countsTowardsTable } from "../football/standings";
import { NEWCASTLE_ID, SUNDERLAND_ID, currentSeason } from "../football/provider";
import { aiComplete, extractJson, GEORDIE_VOICE } from "../ai";
import { jaccard, tokens } from "../content/dedupe";
import { safetyThreshold } from "../predictions/safety";
import type { Club, Fixture, StandingRow } from "../types";
import { passesFactGuard, type BanterFacts, type ClubFacts } from "./facts";
import { templateBanter, type BanterLine } from "./templates";

function clubFacts(id: number, table: StandingRow[], fixtures: Fixture[], clubs: Club[], pred?: { p_relegation: number; p_top6: number; expected_position: number }): ClubFacts | null {
  const row = table.find((r) => r.clubId === id);
  if (!row) return null;
  const name = (cid: number) => clubs.find((c) => c.id === cid)?.shortName ?? String(cid);
  const mine = fixtures.filter((f) => f.homeId === id || f.awayId === id);
  const last = [...mine].filter(countsTowardsTable).sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0];
  const next = mine.filter((f) => f.status === "scheduled" && Date.parse(f.kickoff) > Date.now()).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  const home = (f: Fixture) => f.homeId === id;
  return {
    name: name(id),
    position: row.position,
    points: row.points,
    played: row.played,
    goalDifference: row.goalDifference,
    form: row.form.join(""),
    last: last && {
      opponent: name(home(last) ? last.awayId : last.homeId),
      goalsFor: home(last) ? last.homeGoals! : last.awayGoals!,
      goalsAgainst: home(last) ? last.awayGoals! : last.homeGoals!,
      venue: home(last) ? "home" : "away",
      kickoff: last.kickoff,
      competition: (last.leagueId ?? 39) === 39 ? null : last.competition,
    },
    next: next && { opponent: name(home(next) ? next.awayId : next.homeId), venue: home(next) ? "home" : "away", kickoff: next.kickoff },
    pRelegation: pred ? Number(pred.p_relegation) : undefined,
    pTop6: pred ? Number(pred.p_top6) : undefined,
    expectedPosition: pred ? Number(pred.expected_position) : undefined,
  };
}

export async function buildFacts(): Promise<BanterFacts> {
  const season = currentSeason();
  const db = adminDb();
  const { clubs, allClubs, fixtures } = await loadSeason(season);
  const cups = await loadCupFixtures(season);
  const table = computeStandings(clubs.map((c) => c.id), fixtures);
  const everything = [...fixtures, ...cups];
  const { data: run } = await db.from("model_runs").select("id").eq("season", season).order("created_at", { ascending: false }).limit(1);
  const { data: preds } = run?.[0]
    ? await db.from("predictions").select("club_id, p_relegation, p_top6, expected_position").eq("run_id", run[0].id)
    : { data: [] as { club_id: number; p_relegation: number; p_top6: number; expected_position: number }[] };
  const pred = (id: number) => preds?.find((p) => p.club_id === id);
  const { data: misery } = await db.from("misery_snapshots").select("misery_index, jar_percent").eq("season", season).order("taken_at", { ascending: false }).limit(1);
  const { data: news } = await db.from("news_articles").select("original_headline").eq("status", "published").eq("club", "sunderland").order("published_at", { ascending: false }).limit(1);

  const newcastle = clubFacts(NEWCASTLE_ID, table, everything, allClubs, pred(NEWCASTLE_ID));
  if (!newcastle) throw new Error("Newcastle not found in stored table");
  const sunderland = clubFacts(SUNDERLAND_ID, table, everything, allClubs, pred(SUNDERLAND_ID));
  const safety = sunderland ? safetyThreshold(table, SUNDERLAND_ID, 2 * (table.length - 1)) : null;
  const nextNufc = everything
    .filter((f) => f.status === "scheduled" && (f.homeId === NEWCASTLE_ID || f.awayId === NEWCASTLE_ID) && Date.parse(f.kickoff) > Date.now())
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];

  return {
    date: new Date().toISOString().slice(0, 10),
    newcastle,
    sunderland,
    safetyPointsNeeded: safety?.pointsNeeded,
    derbyNext: !!nextNufc && [nextNufc.homeId, nextNufc.awayId].includes(SUNDERLAND_ID),
    jarPercent: misery?.[0] ? Number(misery[0].jar_percent) : undefined,
    miseryIndex: misery?.[0]?.misery_index,
    latestNewsHeadline: news?.[0]?.original_headline,
  };
}

async function aiBanter(facts: BanterFacts): Promise<BanterLine[]> {
  const system = `${GEORDIE_VOICE}
You are the HOWAYSTATS Mackem Meltdown Generator. Using ONLY the JSON facts supplied, write fresh banter.
Return JSON: [{"kind": "headline"|"post-match"|"misery-report"|"celebration"|"social", "text": "..."}] with 5 items.
Rules: every number you write must appear in the facts; never invent results, injuries, quotes or events; at most one line about the Tears Index;
if Sunderland are doing well, admit it with grudging, funny honesty; keep each line under 160 characters; vary sentence shapes — no two lines starting the same way.`;
  const text = await aiComplete(system, JSON.stringify(facts), 700);
  const lines = extractJson<BanterLine[]>(text) ?? [];
  return lines.filter((l) => l && typeof l.text === "string" && l.text.length <= 200 && passesFactGuard(l.text, facts).ok);
}

/** Daily banter: AI where configured (fact-guarded), templates otherwise; avoids repeating the last fortnight. */
export async function generateBanter() {
  const db = adminDb();
  const facts = await buildFacts();
  let lines: BanterLine[] = [];
  let generatedBy = "template";
  try {
    lines = await aiBanter(facts);
    if (lines.length) generatedBy = "ai";
  } catch {
    /* fall back to templates */
  }
  if (lines.length < 3) {
    lines = [...lines, ...templateBanter(facts)];
  }

  const { data: recent } = await db.from("banter").select("text").gte("for_date", new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10));
  const recentTokens = (recent ?? []).map((r) => tokens(r.text));
  const fresh = lines.filter((l, i) => {
    const t = tokens(l.text);
    if (recentTokens.some((rt) => jaccard(rt, t) > 0.7)) return false;
    return !lines.slice(0, i).some((p) => jaccard(tokens(p.text), t) > 0.7);
  });

  const rows = fresh.slice(0, 8).map((l) => ({ for_date: facts.date, kind: l.kind, text: l.text, facts, generated_by: generatedBy }));
  if (rows.length) await db.from("banter").upsert(rows, { onConflict: "for_date,kind,text", ignoreDuplicates: true });
  return { generated: lines.length, stored: rows.length, by: generatedBy };
}
