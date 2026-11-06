# HOWAYSTATS

**The numbers don't lie.** Premier League statistics. Geordie perspective. Mackem misery.

A Geordie parody football site, 18+. Newcastle fans taking the piss out of Sunderland, built on real data: the Premier League table, a Monte Carlo prediction engine, the Mackem Misery Meter and a newsroom that rewrites real Sunderland and Newcastle stories in our own voice. Created by **Leeko**.

> Independent fan entertainment. Not affiliated with Newcastle United FC, Sunderland AFC, the Premier League or any official organisation. Statistics are real; tears are fictional.

---

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Postgres + Auth) · Vercel (hosting + Cron) · API-Football · AI text (optional: Gemini or Groq free tiers, or Anthropic) · GIPHY / Reddit APIs (optional).

```
app/                 pages, API routes, OG images, sitemap, robots
  page.tsx           homepage: ticker → stadium hero → Newcastle v Sunderland → Misery Centre (jar, odds, gauge, index) → table → Sunderland Watch + Geordie Glory → Wearside Woes → Crying Room → Tyne v Wear + fixtures → records. Reorders itself after a Newcastle win or Sunderland defeat; live games jump to the top.
  premier-league/    full table (overall / home / away), projections, results, fixtures
  newcastle/         Newcastle dashboard + Geordie Glory Meter
  mackem-watch/      Sunderland relegation watch (/sunderland and /relegation-watch redirect here)
  tyne/              Newcastle v Sunderland comparison, "Who owns the North East?"
  news/              The Mackem Newsroom (+ /news/[slug])
  memes/             The Mackem Crying Room + community submissions
  how-it-works/      the full method, printed from the code's own weights
  admin/             protected dashboard (Supabase Auth + email allowlist)
  api/cron/[job]     football | live | predictions | misery | news | memes | banter | cleanup | daily
  api/live           visitor-driven live refresh (max one provider poll a minute, match windows only)
  api/og             branded share graphics (?type=home|relegation|misery|jar|tyne|newcastle|news|meme)
components/          stadium backdrop, meter, news cards, table, live scoreboard
lib/football         provider adapter (API-Football), table + PL tie-breakers, sync
lib/predictions      Poisson ratings, 50,000-season Monte Carlo, safety maths, comparison score
lib/misery           Misery Index, points-dropped history, danger levels, happiness meter
lib/meter.ts         Mackem Misery Meter (count of plain-rule bad signs)
lib/voice.ts         the Geordie voice: headlines, quips, empty/loading/error copy
lib/content          dedupe + voiceCheck (editorial quality control)
lib/news             RSS parsing, classification, discovery + fact-checked rewrites
lib/memes            GIPHY + Reddit discovery, dedupe, daily feature
lib/banter           fact pack, fact guard, templates, Meltdown Generator
lib/database         Supabase clients, mappers, queries
supabase/migrations  schema, indexes, RLS, rate-limit + share functions
tests/               engine, content and misery tests (node:test)
preview/             design-preview renderer (simulated sample data, never shipped)
```

## Status of this build

| Item | State |
|---|---|
| Supabase project `howaystats` (eu-west-2, free tier) | **Created and migrated** — 14 tables, RLS on, security advisor clean apart from two intentional "no public policy" notices (logs, rate limits) |
| Automated tests (28) | **Passing** — table rules, tie-breakers, postponed games, Monte Carlo consistency, 50k-run timing, dedupe, fact guard, misery model |
| Type-check | Passing against stub types (the real `next build` needs `npm install`, which couldn't run in the build sandbox) |
| GitHub repo / Vercel deployment | **Not done yet** — see "Deploy" below |
| API keys | Awaiting you: API-Football, Supabase service role, CRON_SECRET, (optional) Anthropic, GIPHY, Reddit, NewsAPI |

## Run locally

```bash
npm install
cp .env.example .env.local     # fill in the secrets
npm run verify                 # typecheck + tests + production build
npm run dev
```

First data load (with the dev server running):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/football"
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/predictions?force=1"
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/misery"
```

Or sign in at `/admin` and press the buttons.

## Deploy (Vercel)

1. Push this folder to a new GitHub repo (`git init && git add . && git commit -m "HOWAYSTATS" && gh repo create howaystats --private --source . --push`).
2. In Vercel: **Add New → Project → import the repo**. Framework is detected as Next.js.
3. Add every variable from `.env.example` under **Settings → Environment Variables** (Production + Preview).
4. Deploy. Then run the first data load above against the production URL.
5. Supabase → **Authentication → URL Configuration**: set Site URL to your Vercel URL and add `https://<your-domain>/admin/auth/callback` to redirect URLs. Add your admin user under **Authentication → Users** and put the same address in `ADMIN_EMAIL`.

### Cron schedule

`vercel.json` ships four once-a-day jobs, which fit the **Hobby** plan:

| Time (UTC) | Job | Does |
|---|---|---|
| 06:17 | `daily` | football → predictions → news → misery → memes → banter → cleanup (each step isolated) |
| 13:07 | `news` | midday news sweep |
| 17:47 | `football` | refresh after afternoon games (re-models automatically if results changed) |
| 22:53 | `football` | refresh after evening games |

Live scores don't depend on cron: `/api/live` polls the provider at most once a minute, only while a match is on, triggered by visitors on the homepage (the scoreboard only appears while Newcastle or Sunderland are playing). On **Pro** you can add `{"path": "/api/cron/live", "schedule": "* * * * *"}` for unattended minute-by-minute polling (≈ 90 calls per matchday — check your football-data.org plan).

## Data supplier

Two suppliers are built in; pick one with `FOOTBALL_API_PROVIDER`:

- **`football-data`** (default) — football-data.org. Free tier: Premier League (+ Champions League), 10 requests/minute, scores slightly delayed, **no Europa League**. A full refresh uses 5 requests. Goal/card events appear only if your plan includes them.
- **`api-football`** — API-Football (api-sports.io), described below.

Club ids differ between suppliers (Newcastle 67 / Sunderland 71 on football-data.org; 34 / 746 on API-Football). The app picks the right ones automatically. If you ever switch supplier, clear the `fixtures`, `standings`, `clubs` and `predictions` tables first.

### API-Football

One key covers:

- the Premier League table, fixtures and results;
- **Newcastle and Sunderland in every competition** (Europa League/Champions League, FA Cup, League Cup), fetched with `/fixtures?team=…&season=…`;
- live scores and match events (goals, cards).

Premier League games drive the table and the model. European and cup games show up in results, fixtures, the match centre and the headlines, and a Sunderland defeat in one adds to the Misery Index.

**Plan sizing:** the daily refresh uses about 25 calls a day (teams, fixtures, both clubs' all-competition fixtures, standings check, ×4 runs). That fits the free tier of 100 calls a day. Minute-by-minute live polling during a match uses about 1 call a minute, so for live scores on matchdays you'll need a paid API-Football plan.

Not recommended: football-data.org's free tier has delayed scores and no Europa League, so it would miss games like Sunderland v Dinamo Zagreb.

The design preview uses **fake sample numbers** (and says so). The real site never shows a number it didn't get from the provider.

## The data rules

- **No fabricated data anywhere.** Empty tables show an "awaiting kick-off" state, not placeholders. Live means the live job succeeded in the last 3 minutes; everything shows "updated X ago", and data over 36 hours old is flagged stale.
- **Table**: rebuilt from stored results (W3 D1 L0), ordered by points → GD → goals → head-to-head points → head-to-head away goals; still-level clubs are flagged. Our table is verified against the provider's after every sync; mismatches are logged.
- **Predictions**: Poisson attack/defence ratings (time-decayed, last season at 35% weight, shrunk towards priors), then 50,000 full-league simulated seasons. Every run is stored with its seed and input hash, and only re-runs when results change.
- **Mackem Misery Meter**: a count of bad signs for Sunderland, each judged by a plain rule: in the bottom three; one win or fewer in the last five; conceding two a game over the last five; two defeats in a row (or four without a win); lost the last derby; last home crowd under 90% of the 49,000 capacity (only when football-data.org supplies an attendance). Anything not measurable is left out. No weights, no made-up units.
- **Background photo**: St James' Park by Arne Müseler (Wikimedia Commons, CC BY-SA 3.0 DE), loaded by the browser at Wikimedia's standard thumbnail widths only (960/1280/1920). Other widths return HTTP 429. To self-host, put a licensed photo in /public and set NEXT_PUBLIC_HERO_IMAGE.
- **Editorial quality control**: every Sunderland story (win, loss, draw, signing, sacking, good news) is rewritten from a Newcastle view as headline + take + facts + punchline + link. `lib/content/voice-check.ts` rejects AI clichés, Americanisms, emoji, more than one "!", dialect overload and headlines too close to the original; the fact guard rejects any number or name not in the source. Failures wait in /admin, where the headline, take and punchline can be edited.
- **Misery Index**: relegation odds (0–40) + league position (0–20) + recent results (−20 to +40, fading over a fortnight). All three parts are shown wherever the index appears. Recomputed from scratch from real fixtures, so nothing is double-counted.
- **News**: publisher RSS (BBC Sport, The Guardian, Sky Sports) + optional NewsAPI. AI rewrites are rejected automatically if they contain any number or quote not in the original headline/summary; rejected ones wait for an admin. Original headline, publisher, date and link are always shown.
- **Memes**: GIPHY (auto-published with attribution) and Reddit's official API (moderated). Media stays on the source host. No new meme today → the best previously approved meme, labelled "From the archive".
- **Banter**: generated only from a fact pack built from the database; any line with an unsupplied number is thrown away; templates are the fallback.

## Maintenance

- **New season**: nothing to do. The season rolls over on 1 July (override with `FOOTBALL_SEASON`), promoted clubs get a below-average prior, last season's ratings become priors, and the old season's Tears Index is archived.
- **API health / logs / moderation / banter edits**: `/admin`.
- **Hero photo**: "Newcastle st-james-park stadium.jpg" by Arne Müseler (arne-mueseler.com), Wikimedia Commons, CC BY-SA 3.0 DE — credited in the footer. Swap it with `NEXT_PUBLIC_HERO_IMAGE`.
- **Club crests** come from the data provider and are used only to identify clubs.
- `npm test` covers the football calculations and prediction engine; run it after any change to `lib/`.

HOWAY THE LADS.
