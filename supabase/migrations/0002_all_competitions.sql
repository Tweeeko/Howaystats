-- Newcastle & Sunderland fixtures in every competition (Europe, cups), not just the Premier League.
alter table fixtures add column if not exists competition text;
create index if not exists fixtures_league_idx on fixtures (season, league_id);
