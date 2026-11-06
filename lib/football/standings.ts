import type { Fixture, FormResult, Split, StandingRow } from "../types";

/** Premier League points rules. */
export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

const emptySplit = (): Split => ({
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
});

/** A fixture counts towards the table only when it is finished and has a score. */
export function countsTowardsTable(f: Fixture): boolean {
  return f.status === "finished" && f.homeGoals !== null && f.awayGoals !== null;
}

function apply(split: Split, gf: number, ga: number) {
  split.played += 1;
  split.goalsFor += gf;
  split.goalsAgainst += ga;
  if (gf > ga) {
    split.won += 1;
    split.points += POINTS.win;
  } else if (gf === ga) {
    split.drawn += 1;
    split.points += POINTS.draw;
  } else {
    split.lost += 1;
    split.points += POINTS.loss;
  }
}

function resultFor(gf: number, ga: number): FormResult {
  return gf > ga ? "W" : gf === ga ? "D" : "L";
}

/**
 * Build the league table from completed fixtures.
 *
 * Ordering follows Premier League Rule C.17:
 *   1. points  2. goal difference  3. goals scored
 *   4. points in matches between the tied clubs
 *   5. away goals scored in matches between the tied clubs
 *   6. otherwise level — a play-off would be required if it decides the title,
 *      relegation or European qualification. We flag these rows with `unresolvedTie`
 *      and order them alphabetically (via `nameOf`) for display only.
 *
 * Postponed, cancelled, suspended and unfinished fixtures are ignored.
 */
export function computeStandings(
  clubIds: number[],
  fixtures: Fixture[],
  nameOf: (id: number) => string = (id) => String(id),
): StandingRow[] {
  const totals = new Map<number, Split>();
  const home = new Map<number, Split>();
  const away = new Map<number, Split>();
  const form = new Map<number, { kickoff: string; r: FormResult }[]>();

  for (const id of clubIds) {
    totals.set(id, emptySplit());
    home.set(id, emptySplit());
    away.set(id, emptySplit());
    form.set(id, []);
  }

  const completed = uniqueById(fixtures).filter(countsTowardsTable);

  for (const f of completed) {
    const hg = f.homeGoals as number;
    const ag = f.awayGoals as number;
    const th = totals.get(f.homeId);
    const ta = totals.get(f.awayId);
    if (!th || !ta) continue; // fixture involves a club outside this league
    apply(th, hg, ag);
    apply(ta, ag, hg);
    apply(home.get(f.homeId)!, hg, ag);
    apply(away.get(f.awayId)!, ag, hg);
    form.get(f.homeId)!.push({ kickoff: f.kickoff, r: resultFor(hg, ag) });
    form.get(f.awayId)!.push({ kickoff: f.kickoff, r: resultFor(ag, hg) });
  }

  const rows: StandingRow[] = clubIds.map((id) => {
    const t = totals.get(id)!;
    const recent = form
      .get(id)!
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
      .slice(-5)
      .map((x) => x.r);
    return {
      ...t,
      clubId: id,
      position: 0,
      goalDifference: t.goalsFor - t.goalsAgainst,
      form: recent,
      home: home.get(id)!,
      away: away.get(id)!,
      unresolvedTie: false,
    };
  });

  // Primary sort: points, GD, GF.
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
  );

  // Resolve groups level on points, GD and GF using head-to-head.
  const ordered: StandingRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (
      j < rows.length &&
      rows[j].points === rows[i].points &&
      rows[j].goalDifference === rows[i].goalDifference &&
      rows[j].goalsFor === rows[i].goalsFor
    ) {
      j++;
    }
    const group = rows.slice(i, j);
    ordered.push(...(group.length > 1 ? resolveHeadToHead(group, completed, nameOf) : group));
    i = j;
  }

  ordered.forEach((r, idx) => (r.position = idx + 1));
  return ordered;
}

function resolveHeadToHead(
  group: StandingRow[],
  completed: Fixture[],
  nameOf: (id: number) => string,
): StandingRow[] {
  const ids = new Set(group.map((r) => r.clubId));
  const h2hPts = new Map<number, number>();
  const h2hAwayGoals = new Map<number, number>();
  for (const id of ids) {
    h2hPts.set(id, 0);
    h2hAwayGoals.set(id, 0);
  }
  for (const f of completed) {
    if (!ids.has(f.homeId) || !ids.has(f.awayId)) continue;
    const hg = f.homeGoals as number;
    const ag = f.awayGoals as number;
    const hp = hg > ag ? 3 : hg === ag ? 1 : 0;
    const ap = ag > hg ? 3 : hg === ag ? 1 : 0;
    h2hPts.set(f.homeId, h2hPts.get(f.homeId)! + hp);
    h2hPts.set(f.awayId, h2hPts.get(f.awayId)! + ap);
    h2hAwayGoals.set(f.awayId, h2hAwayGoals.get(f.awayId)! + ag);
  }

  const key = (r: StandingRow) => [h2hPts.get(r.clubId)!, h2hAwayGoals.get(r.clubId)!] as const;
  const sorted = [...group].sort((a, b) => {
    const [ap, aa] = key(a);
    const [bp, ba] = key(b);
    return bp - ap || ba - aa || nameOf(a.clubId).localeCompare(nameOf(b.clubId));
  });

  // Flag anyone still level on every rule with a neighbour.
  for (let k = 0; k < sorted.length; k++) {
    const [p, a] = key(sorted[k]);
    const prev = sorted[k - 1];
    const next = sorted[k + 1];
    const same = (r?: StandingRow) => !!r && key(r)[0] === p && key(r)[1] === a;
    if (same(prev) || same(next)) sorted[k].unresolvedTie = true;
  }
  return sorted;
}

/** Points won in the last `n` completed matches for a club. */
export function pointsInLast(row: StandingRow, n = 5): number {
  return row.form.slice(-n).reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
}

/** Guard against a provider/database returning the same fixture twice: last copy wins. */
export function uniqueById(fixtures: Fixture[]): Fixture[] {
  const m = new Map<number, Fixture>();
  for (const f of fixtures) m.set(f.id, f);
  return [...m.values()];
}
