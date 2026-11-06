import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, isDuplicate } from "../lib/content/dedupe";
import { parseFeed } from "../lib/news/rss";
import { classifyStory } from "../lib/news/classify";
import { passesFactGuard, type BanterFacts } from "../lib/banter/facts";
import { templateBanter } from "../lib/banter/templates";
import { voiceCheck } from "../lib/content/voice-check";

test("canonical URL strips tracking, www and trailing slash", () => {
  assert.equal(
    canonicalUrl("http://www.bbc.co.uk/sport/football/123/?utm_source=x&b=2&a=1#top"),
    "https://bbc.co.uk/sport/football/123?a=1&b=2",
  );
});

test("news duplicate detection: same URL and near-identical headline", () => {
  const existing = [
    { url: "https://bbc.co.uk/sport/a", title: "Sunderland suffer defeat after defensive errors", publishedAt: "2026-11-01T12:00:00Z" },
  ];
  assert.ok(isDuplicate({ url: "https://www.bbc.co.uk/sport/a?utm_medium=rss", title: "x" }, existing));
  assert.ok(
    isDuplicate(
      { url: "https://other.com/b", title: "Sunderland suffer defeat after more defensive errors", publishedAt: "2026-11-01T18:00:00Z" },
      existing,
    ),
  );
  assert.ok(!isDuplicate({ url: "https://other.com/c", title: "Newcastle sign new striker", publishedAt: "2026-11-01T18:00:00Z" }, existing));
  // Similar headline but weeks apart → different story
  assert.ok(
    !isDuplicate(
      { url: "https://other.com/d", title: "Sunderland suffer defeat after defensive errors", publishedAt: "2026-12-01T18:00:00Z" },
      existing,
    ),
  );
});

test("meme duplicate detection by source link", () => {
  const seen = [{ url: "https://reddit.com/r/soccer/comments/abc/x/", title: "meme" }];
  assert.ok(isDuplicate({ url: "https://www.reddit.com/r/soccer/comments/abc/x", title: "different title" }, seen));
});

test("RSS parsing", () => {
  const xml = `<rss><channel><item><title><![CDATA[Sunderland beaten at home]]></title>
  <link>https://example.com/a</link><description>&lt;p&gt;The Black Cats lost 0-2.&lt;/p&gt;</description>
  <pubDate>Sun, 01 Nov 2026 18:00:00 GMT</pubDate></item></channel></rss>`;
  const items = parseFeed(xml, "Example");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Sunderland beaten at home");
  assert.equal(items[0].summary, "The Black Cats lost 0-2.");
  assert.equal(items[0].publishedAt, "2026-11-01T18:00:00.000Z");
});

test("classification: relevant negative Sunderland story", () => {
  const c = classifyStory("Bottom club Sunderland to stick with manager despite poor start");
  assert.ok(c.aboutSunderland);
  assert.ok(c.negativity > 0.2);
  assert.equal(c.category, "championship-watch");
});

test("classification: ignores non-football Sunderland, roasts every football story", () => {
  assert.equal(classifyStory("Sunderland City Council approves new bus lane").aboutSunderland, false);
  const win = classifyStory("Sunderland beat Chelsea in stunning win");
  assert.equal(win.storyType, "win");
  assert.equal(win.category, "carried-away");
  assert.equal(classifyStory("Chelsea beat Sunderland 3-0").storyType, "loss");
  assert.equal(classifyStory("Sunderland sack head coach after winless run").storyType, "sacking");
  assert.equal(classifyStory("Sunderland sign striker on four-year deal").storyType, "signing");
});

test("voice check: blocks AI phrasing, Americanisms, shouting and copied headlines", () => {
  assert.equal(voiceCheck("Sunderland lose again. Someone check on them.").ok, true);
  assert.equal(voiceCheck("In a stunning turn of events, Sunderland fell to defeat.").ok, false);
  assert.equal(voiceCheck("Sunderland's defense was a mess.").ok, false);
  assert.equal(voiceCheck("Get in!! Get in!!").ok, false);
  assert.equal(voiceCheck("Sunderland beaten by Chelsea at home", "Sunderland beaten by Chelsea at home", { isHeadline: true }).ok, false);
});

const facts: BanterFacts = {
  date: "2026-11-06",
  newcastle: { name: "Newcastle", position: 8, points: 14, played: 10, goalDifference: 3, form: "WDWLW",
    last: { opponent: "Everton", goalsFor: 2, goalsAgainst: 0, venue: "home", kickoff: "2026-11-02" } },
  sunderland: { name: "Sunderland", position: 20, points: 5, played: 9, goalDifference: -10, form: "LLDLL", pRelegation: 0.67,
    last: { opponent: "Chelsea", goalsFor: 0, goalsAgainst: 3, venue: "home", kickoff: "2026-11-01" } },
};

test("fact guard rejects invented numbers and quotes", () => {
  assert.ok(passesFactGuard("Sunderland relegation probability: 67%.", facts).ok);
  assert.equal(passesFactGuard("Sunderland have lost 11 in a row.", facts).ok, false);
  assert.equal(passesFactGuard('The manager said "we are finished".', facts).ok, false);
});

test("template banter only ever uses supplied facts", () => {
  const lines = templateBanter(facts);
  assert.ok(lines.length >= 3);
  for (const l of lines) assert.ok(passesFactGuard(l.text, facts).ok, `${l.text} failed`);
});
