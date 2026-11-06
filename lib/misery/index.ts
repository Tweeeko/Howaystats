import type { Fixture, StandingRow } from "../types";
import { computeStandings, countsTowardsTable, uniqueById } from "../football/standings";

/**
 * THE MACKEM MISERY INDEX, THE TEAR JAR AND THE GEORDIE HAPPINESS METER
 * ---------------------------------------------------------------------
 * Entertainment scores built only from real data: finished fixtures, the league table replayed
 * match by match, model output and published (verified) news. Everything is recomputed from
 * scratch each time and every event is keyed to one fixture, so nothing is counted twice.
 * Documented on /how-it-works.
 */

export interface MiseryInputs {
  clubIds: number[];
  fixtures: Fixture[]; // this season's Premier League fixtures, all statuses
  cupFixtures?: Fixture[]; // Sunderland/Newcastle in Europe and the cups
  sunderlandId: number;
  newcastleId: number;
  relegationPlaces?: number;
  negativeNewsDates?: string[]; // publication dates of published negative Sunderland stories
  now?: Date;
  nameOf?: (id: number) => string;
}

export interface MiseryEvent {
  key: string; // stable id: one event per fixture/rule, prevents double counting
  at: string;
  label: string;
  misery: number; // points into the Misery Index (before fading)
  fixtureId?: number;
}

/** Misery Index points per event. Kept in one place so /how-it-works can print them. */
export const WEIGHTS = {
  loss: 6,
  heavyLossExtra: 4, // lost by 3+
  draw: 1,
  win: -7,
  streakLoss: 2, // each consecutive league defeat after the first
  sixPointerLoss: 3, // defeat to a club in the bottom six at the time
  positionDrop: 1, // per place dropped after a matchday
  enterZone: 8,
  leaveZone: -8,
  rivalWin: 2, // Newcastle win
  cupLoss: 4, // defeat in Europe or a cup
  cupWin: -3,
  news: 1, // per verified negative story (capped weekly)
  newsWeeklyCap: 3,
  eventHalfLifeDays: 14,
} as const;

const DAY = 86_400_000;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function miseryEvents(inp: MiseryInputs): MiseryEvent[] {
  const rel = inp.relegationPlaces ?? 3;
  const n = inp.clubIds.length;
  const zoneStart = n - rel + 1; // e.g. 18
  const sun = inp.sunderlandId;
  const nameOf = inp.nameOf ?? ((id: number) => `Club ${id}`);
  const done = uniqueById(inp.fixtures).filter(countsTowardsTable).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const events: MiseryEvent[] = [];

  let prevPos: number | null = null;
  let inZone = false;
  let lossStreak = 0;
  const playedSoFar: Fixture[] = [];

  for (const f of done) {
    const tableBefore = f.homeId === sun || f.awayId === sun ? computeStandings(inp.clubIds, playedSoFar, nameOf) : null;
    playedSoFar.push(f);

    if (f.homeId === inp.newcastleId || f.awayId === inp.newcastleId) {
      const nufcHome = f.homeId === inp.newcastleId;
      const gf = nufcHome ? f.homeGoals! : f.awayGoals!;
      const ga = nufcHome ? f.awayGoals! : f.homeGoals!;
      const vsSun = f.homeId === sun || f.awayId === sun;
      if (gf > ga && !vsSun) {
        events.push({ key: `rival-${f.id}`, at: f.kickoff, label: `Newcastle beat ${nameOf(nufcHome ? f.awayId : f.homeId)}`, fixtureId: f.id, misery: WEIGHTS.rivalWin });
      }
    }

    if (f.homeId !== sun && f.awayId !== sun) continue;
    const home = f.homeId === sun;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    const opp = home ? f.awayId : f.homeId;
    const score = `${gf}-${ga}`;

    if (gf < ga) {
      lossStreak++;
      events.push({ key: `loss-${f.id}`, at: f.kickoff, label: `Lost ${score} to ${nameOf(opp)}`, fixtureId: f.id, misery: WEIGHTS.loss });
      if (ga - gf >= 3) events.push({ key: `heavy-${f.id}`, at: f.kickoff, label: `Heavy defeat (${score})`, fixtureId: f.id, misery: WEIGHTS.heavyLossExtra });
      if (lossStreak >= 2) events.push({ key: `streak-${f.id}`, at: f.kickoff, label: `${lossStreak} league defeats in a row`, fixtureId: f.id, misery: WEIGHTS.streakLoss });
      const oppRow = tableBefore?.find((r) => r.clubId === opp);
      if (oppRow && oppRow.played > 0 && oppRow.position > n - 6) {
        events.push({ key: `six-${f.id}`, at: f.kickoff, label: `Lost a six-pointer to ${nameOf(opp)}`, fixtureId: f.id, misery: WEIGHTS.sixPointerLoss });
      }
    } else if (gf === ga) {
      lossStreak = 0;
      events.push({ key: `draw-${f.id}`, at: f.kickoff, label: `Drew ${score} with ${nameOf(opp)}`, fixtureId: f.id, misery: WEIGHTS.draw });
    } else {
      lossStreak = 0;
      events.push({ key: `win-${f.id}`, at: f.kickoff, label: `Beat ${nameOf(opp)} ${score}`, fixtureId: f.id, misery: WEIGHTS.win });
    }

    const after = computeStandings(inp.clubIds, playedSoFar, nameOf);
    const pos = after.find((r) => r.clubId === sun)!.position;
    if (prevPos !== null && pos > prevPos) {
      const k = pos - prevPos;
      events.push({ key: `drop-${f.id}`, at: f.kickoff, label: `Dropped ${k} place${k > 1 ? "s" : ""} to ${pos}`, fixtureId: f.id, misery: WEIGHTS.positionDrop * k });
    }
    const nowInZone = pos >= zoneStart;
    if (nowInZone && !inZone) events.push({ key: `zone-in-${f.id}`, at: f.kickoff, label: "Into the bottom three", fixtureId: f.id, misery: WEIGHTS.enterZone });
    if (!nowInZone && inZone) events.push({ key: `zone-out-${f.id}`, at: f.kickoff, label: "Out of the bottom three", fixtureId: f.id, misery: WEIGHTS.leaveZone });
    inZone = nowInZone;
    prevPos = pos;
  }

  // Defeats outside the league (Europe, cups) still hurt. No league points, so no table effects.
  for (const f of uniqueById(inp.cupFixtures ?? []).filter(countsTowardsTable)) {
    if (f.homeId !== sun && f.awayId !== sun) continue;
    const home = f.homeId === sun;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    const opp = nameOf(home ? f.awayId : f.homeId);
    const comp = f.competition ?? "cup";
    if (gf < ga) events.push({ key: `cuploss-${f.id}`, at: f.kickoff, label: `Lost ${gf}-${ga} to ${opp} (${comp})`, fixtureId: f.id, misery: WEIGHTS.cupLoss });
    else if (gf > ga) events.push({ key: `cupwin-${f.id}`, at: f.kickoff, label: `Beat ${opp} ${gf}-${ga} (${comp})`, fixtureId: f.id, misery: WEIGHTS.cupWin });
  }

  // Verified negative news, capped per ISO week so a busy news day can't flood the index.
  const perWeek = new Map<string, number>();
  for (const at of [...(inp.negativeNewsDates ?? [])].sort()) {
    const wk = isoWeek(new Date(at));
    const c = perWeek.get(wk) ?? 0;
    if (c >= WEIGHTS.newsWeeklyCap) continue;
    perWeek.set(wk, c + 1);
    events.push({ key: `news-${at}-${c}`, at, label: "Bad news on Wearside", misery: WEIGHTS.news });
  }

  const seen = new Set<string>();
  return events
    .filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
    .sort((a, b) => a.at.localeCompare(b.at));
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y.getTime()) / DAY + 1) / 7)}`;
}

/**
 * Misery Index (0–100) as of a moment in time, in three visible parts:
 *   relegation odds   (0–40) = 40 × relegation probability
 *   league position   (0–20) = 20 × (position − 1) / (clubs − 1)
 *   recent results  (−20…+40) = Σ event points, each fading by half every 14 days
 */
export function miseryIndexAt(
  events: MiseryEvent[],
  state: { pRelegation: number; position: number; leagueSize: number },
  at: Date,
) {
  const odds = 40 * state.pRelegation;
  const position = 20 * ((state.position - 1) / Math.max(1, state.leagueSize - 1));
  let ev = 0;
  for (const e of events) {
    const t = Date.parse(e.at);
    if (t > at.getTime()) continue;
    const age = (at.getTime() - t) / DAY;
    ev += e.misery * Math.pow(0.5, age / WEIGHTS.eventHalfLifeDays);
  }
  const results = clamp(ev, -20, 40);
  return {
    score: Math.round(clamp(odds + position + results, 0, 100)),
    parts: { odds: Math.round(odds), position: Math.round(position), results: Math.round(results) },
    stateScore: odds + position,
    eventScore: results,
  };
}

export function miseryLabel(score: number) {
  if (score >= 100) return "THE ENTIRE JAR HAS GONE.";
  if (score >= 80) return "Emergency supply of tissues required.";
  if (score >= 60) return "Wearside meltdown.";
  if (score >= 40) return "Things are getting uncomfortable.";
  if (score >= 20) return "A bit of Wearside frustration.";
  return "Mackems having a lovely time.";
}

/**
 * THE TEAR JAR — deliberately simple: every league point Sunderland drop goes in the jar.
 * Capacity = the most points a club can drop and still reach 38 (the old safety mark):
 * 3 × games − 38 = 76 in a 38-game season. Full jar = 38 points is no longer possible.
 * Resets each season.
 */
export interface TearJar {
  percent: number; // 0..100
  dropped: number; // points dropped so far
  capacity: number;
  played: number;
  overflowed: boolean;
  milestones: number[];
  last: { label: string; added: number } | null;
  history: { fixtureId: number; at: string; label: string; added: number; dropped: number; percent: number }[];
  line: string;
}

export const SAFETY_MARK = 38;

export function tearJar(fixtures: Fixture[], sunderlandId: number, nameOf: (id: number) => string = (id) => String(id), totalGames = 38): TearJar {
  const capacity = 3 * totalGames - SAFETY_MARK;
  const games = uniqueById(fixtures)
    .filter(countsTowardsTable)
    .filter((f) => (f.leagueId ?? 39) === 39)
    .filter((f) => f.homeId === sunderlandId || f.awayId === sunderlandId)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  let dropped = 0;
  const history: TearJar["history"] = [];
  for (const f of games) {
    const home = f.homeId === sunderlandId;
    const gf = home ? f.homeGoals! : f.awayGoals!;
    const ga = home ? f.awayGoals! : f.homeGoals!;
    const added = gf > ga ? 0 : gf === ga ? 2 : 3;
    dropped += added;
    const opp = nameOf(home ? f.awayId : f.homeId);
    const label = gf > ga ? `Beat ${opp} ${gf}-${ga}` : gf === ga ? `Drew ${gf}-${ga} with ${opp}` : `Lost ${gf}-${ga} to ${opp}`;
    history.push({ fixtureId: f.id, at: f.kickoff, label, added, dropped, percent: Math.min(100, Math.round((1000 * dropped) / capacity) / 10) });
  }
  const percent = Math.min(100, Math.round((1000 * dropped) / capacity) / 10);
  const lastH = history[history.length - 1];
  return {
    percent,
    dropped,
    capacity,
    played: games.length,
    overflowed: dropped > capacity,
    milestones: [25, 50, 75, 100].filter((m) => percent >= m),
    last: lastH ? { label: lastH.label, added: lastH.added } : null,
    history: history.reverse(),
    line: jarLine(percent, dropped > capacity),
  };
}

export function jarLine(p: number, overflowed = false) {
  if (overflowed) return "The jar has overflown. 38 points is gone. Contact Wearside Emergency Services.";
  if (p >= 75) return "Getting very full.";
  if (p >= 50) return "Over half full, and we're not even at the run-in.";
  if (p >= 25) return "Steady drip.";
  if (p > 0) return "A few drops in.";
  return "Bone dry. For now.";
}

export type DangerLevel = "Comfortable" | "Getting Nervous" | "Danger Zone" | "Championship Bound" | "Absolute Panic";

/** Danger gauge level, driven only by the model and the real table. */
export function dangerLevel(pRelegation: number, position: number, leagueSize = 20, relegationPlaces = 3): DangerLevel {
  const inZone = position > leagueSize - relegationPlaces;
  if (pRelegation >= 0.85) return "Absolute Panic";
  if (pRelegation >= 0.6) return "Championship Bound";
  if (pRelegation >= 0.3 || inZone) return "Danger Zone";
  if (pRelegation >= 0.1) return "Getting Nervous";
  return "Comfortable";
}

/** Relegation-watch distances from the real table. */
export function watchDistances(table: StandingRow[], clubId: number, leagueSize = 20, relegationPlaces = 3) {
  const me = table.find((r) => r.clubId === clubId);
  if (!me) return null;
  const safeLine = table[leagueSize - relegationPlaces - 1]; // 17th
  const above = table[me.position - 2];
  return {
    toSeventeenth: safeLine ? safeLine.points - me.points : 0, // positive = points behind 17th
    toTeamAbove: above ? above.points - me.points : 0,
    teamAboveId: above?.clubId ?? null,
    pointsDropped: 3 * me.played - me.points,
  };
}

/** Geordie Happiness Meter (0–100): 30% PPG, 30% last-five points, 20% top-six chance, 20% safety. */
export function happiness(row: StandingRow, pTop6: number, pRelegation: number) {
  const ppg = row.played ? row.points / row.played / 3 : 0.5;
  const last5 = row.form.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / Math.max(3, 3 * row.form.length);
  const score = Math.round(100 * (0.3 * ppg + 0.3 * last5 + 0.2 * pTop6 + 0.2 * (1 - pRelegation)));
  const line =
    score >= 80 ? "Ecstatic. Dancing on the Tyne Bridge." :
    score >= 60 ? "Canny happy, like." :
    score >= 40 ? "Fine. Grand. Mustn't grumble." :
    score >= 20 ? "Bit glum. Pint needed." :
    "Grim. But at least we're not them.";
  return { score, line };
}
