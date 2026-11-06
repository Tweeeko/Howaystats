import { test } from "node:test";
import assert from "node:assert/strict";
import { mapFdMatch, mapFdTeam, fdStatus } from "../lib/football/football-data-map";
import { computeStandings } from "../lib/football/standings";

const team = (id: number, name: string, tla: string) => ({ id, name, shortName: name.replace(" AFC", "").replace(" FC", ""), tla, crest: `https://crests.football-data.org/${id}.png` });

test("football-data.org: statuses map correctly", () => {
  assert.equal(fdStatus("TIMED"), "scheduled");
  assert.equal(fdStatus("IN_PLAY"), "live");
  assert.equal(fdStatus("PAUSED"), "halftime");
  assert.equal(fdStatus("FINISHED"), "finished");
  assert.equal(fdStatus("POSTPONED"), "postponed");
  assert.equal(fdStatus("CANCELLED"), "cancelled");
});

test("football-data.org: a finished PL match becomes a league fixture the table can use", () => {
  const f = mapFdMatch(
    {
      id: 555,
      utcDate: "2026-11-01T15:00:00Z",
      status: "FINISHED",
      matchday: 10,
      competition: { id: 2021, name: "Premier League" },
      season: { startDate: "2026-08-21" },
      homeTeam: team(71, "Sunderland AFC", "SUN"),
      awayTeam: team(61, "Chelsea FC", "CHE"),
      score: { fullTime: { home: 0, away: 2 }, halfTime: { home: 0, away: 1 } },
    },
    2026,
  );
  assert.equal(f.leagueId, 39, "Premier League is stored as the internal league id");
  assert.equal(f.season, 2026);
  assert.equal(f.status, "finished");
  assert.equal(f.homeGoals, 0);
  assert.equal(f.awayGoals, 2);
  const t = computeStandings([71, 61], [f]);
  assert.equal(t.find((r) => r.clubId === 61)!.points, 3);
});

test("football-data.org: scheduled games carry no score; Europe keeps its competition", () => {
  const f = mapFdMatch(
    {
      id: 777,
      utcDate: "2026-11-26T20:00:00Z",
      status: "TIMED",
      competition: { id: 2001, name: "UEFA Champions League" },
      homeTeam: team(67, "Newcastle United FC", "NEW"),
      awayTeam: team(5, "FC Bayern München", "FCB"),
      score: { fullTime: { home: null, away: null } },
    },
    2026,
  );
  assert.equal(f.leagueId, 2001);
  assert.equal(f.competition, "UEFA Champions League");
  assert.equal(f.homeGoals, null);
});

test("football-data.org: teams map to clean names and codes", () => {
  const c = mapFdTeam(team(67, "Newcastle United FC", "NEW"));
  assert.equal(c.name, "Newcastle United");
  assert.equal(c.code, "NEW");
  assert.equal(c.id, 67);
});
