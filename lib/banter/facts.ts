/** The only material the Banter Engine is allowed to joke about. Built from the database, never invented. */
export interface LastResult {
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  venue: "home" | "away";
  kickoff: string;
  competition?: string | null; // null/undefined = Premier League
}

export interface ClubFacts {
  name: string;
  position: number;
  points: number;
  played: number;
  goalDifference: number;
  form: string; // e.g. "WDLLW"
  last?: LastResult;
  next?: { opponent: string; venue: "home" | "away"; kickoff: string };
  pRelegation?: number; // 0..1
  pTop6?: number;
  expectedPosition?: number;
}

export interface BanterFacts {
  date: string; // YYYY-MM-DD
  newcastle: ClubFacts;
  sunderland: ClubFacts | null; // null when Sunderland are not in the league being tracked
  safetyPointsNeeded?: number;
  derbyNext?: boolean;
  jarPercent?: number; // Tear Jar fill, 0..100
  miseryIndex?: number; // 0..100
  latestNewsHeadline?: string; // a verified, published headline
}

/** Every number that may legitimately appear in generated copy, in the forms we'd print them. */
export function allowedNumbers(f: BanterFacts): Set<string> {
  const s = new Set<string>();
  const add = (n: number | undefined) => {
    if (n === undefined || Number.isNaN(n)) return;
    s.add(String(n));
    s.add(String(Math.abs(n)));
  };
  const pct = (p: number | undefined) => {
    if (p === undefined) return;
    add(Math.round(p * 100));
  };
  const ordinal = (n: number) => add(n);
  for (const c of [f.newcastle, f.sunderland]) {
    if (!c) continue;
    ordinal(c.position);
    add(c.points);
    add(c.played);
    add(c.goalDifference);
    add(38 - c.played);
    if (c.last) {
      add(c.last.goalsFor);
      add(c.last.goalsAgainst);
    }
    pct(c.pRelegation);
    pct(c.pTop6);
    if (c.pRelegation !== undefined) pct(1 - c.pRelegation);
    if (c.expectedPosition !== undefined) add(Math.round(c.expectedPosition));
  }
  if (f.sunderland) {
    add(Math.abs(f.newcastle.points - f.sunderland.points));
    add(Math.abs(f.newcastle.position - f.sunderland.position));
  }
  add(f.safetyPointsNeeded);
  if (f.jarPercent !== undefined) add(Math.round(f.jarPercent));
  add(f.miseryIndex);
  for (const n of f.latestNewsHeadline?.match(/\d+/g) ?? []) s.add(n);
  add(3); // "three points" is football grammar, not a stat claim
  add(1);
  add(0);
  return s;
}

/**
 * Fact guard: reject generated copy that contains any number we did not supply,
 * or that puts words in anyone's mouth. This is what stops the AI inventing stats.
 */
export function passesFactGuard(text: string, facts: BanterFacts): { ok: boolean; reason?: string } {
  const allowed = allowedNumbers(facts);
  const nums = text.match(/\d+(?:\.\d+)?/g) ?? [];
  for (const n of nums) {
    // Ignore years like 2026 that match the fact date, and scorelines are already allowed digits.
    if (facts.date.startsWith(n)) continue;
    if (!allowed.has(n)) return { ok: false, reason: `number ${n} not in facts` };
  }
  if (/\b(said|says|told|admitted|claims?)\b[^.]*["“]/i.test(text)) {
    return { ok: false, reason: "contains a quote attribution" };
  }
  return { ok: true };
}
