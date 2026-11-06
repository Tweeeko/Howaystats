-- HOWAYSTATS initial schema
-- Public (anon) role: read-only access to published data via RLS.
-- All writes happen server-side with the service-role key (cron jobs, admin, moderated submissions).

create extension if not exists pgcrypto;

-- ───────────── Football data ─────────────
create table if not exists clubs (
  id integer primary key,                    -- provider team id
  name text not null,
  short_name text not null,
  code text not null,
  slug text not null unique,
  logo_url text,
  updated_at timestamptz not null default now()
);

create table if not exists fixtures (
  id bigint primary key,                     -- provider fixture id
  season integer not null,
  league_id integer not null default 39,
  round text,
  kickoff timestamptz not null,
  status text not null check (status in ('scheduled','live','halftime','finished','postponed','cancelled','suspended')),
  status_short text not null,
  elapsed integer,
  home_id integer not null references clubs(id),
  away_id integer not null references clubs(id),
  home_goals integer,
  away_goals integer,
  ht_home integer,
  ht_away integer,
  venue text,
  verified_at timestamptz,                   -- set when a finished score has been re-fetched and matched
  updated_at timestamptz not null default now()
);
create index if not exists fixtures_season_kickoff_idx on fixtures (season, kickoff);
create index if not exists fixtures_status_idx on fixtures (status);
create index if not exists fixtures_home_idx on fixtures (home_id, season);
create index if not exists fixtures_away_idx on fixtures (away_id, season);

create table if not exists fixture_events (
  id bigserial primary key,
  fixture_id bigint not null references fixtures(id) on delete cascade,
  minute integer not null,
  extra integer,
  team_id integer references clubs(id),
  player text,
  assist text,
  type text not null,
  detail text,
  unique nulls not distinct (fixture_id, minute, extra, team_id, type, detail, player)
);
create index if not exists fixture_events_fixture_idx on fixture_events (fixture_id);

create table if not exists standings (
  season integer not null,
  club_id integer not null references clubs(id),
  position integer not null,
  played integer not null,
  won integer not null,
  drawn integer not null,
  lost integer not null,
  goals_for integer not null,
  goals_against integer not null,
  goal_difference integer not null,
  points integer not null,
  form text not null default '',
  home jsonb not null,
  away jsonb not null,
  unresolved_tie boolean not null default false,
  computed_at timestamptz not null default now(),
  primary key (season, club_id)
);
create index if not exists standings_position_idx on standings (season, position);

-- ───────────── Model ─────────────
create table if not exists model_runs (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  created_at timestamptz not null default now(),
  simulations integer not null,
  seed integer not null,
  fixtures_remaining integer not null,
  matches_used numeric not null,
  home_advantage numeric not null,
  duration_ms integer not null,
  input_hash text not null,
  confidence text not null,
  notes text
);
create index if not exists model_runs_season_created_idx on model_runs (season, created_at desc);

create table if not exists predictions (
  run_id uuid not null references model_runs(id) on delete cascade,
  club_id integer not null references clubs(id),
  expected_points numeric not null,
  expected_position numeric not null,
  projected_position integer not null,
  median_points integer not null,
  points_p10 integer not null,
  points_p90 integer not null,
  position_probs jsonb not null,
  p_title numeric not null,
  p_top4 numeric not null,
  p_top5 numeric not null,
  p_top6 numeric not null,
  p_top7 numeric not null,
  p_top10 numeric not null,
  p_relegation numeric not null,
  p_survival numeric not null,
  p18 numeric not null,
  p19 numeric not null,
  p20 numeric not null,
  fixture_difficulty numeric not null,
  remaining integer not null,
  attack numeric,
  defence numeric,
  primary key (run_id, club_id)
);

-- ───────────── Misery department ─────────────
create table if not exists misery_snapshots (
  id bigserial primary key,
  season integer not null,
  taken_at timestamptz not null default now(),
  misery_index integer not null check (misery_index between 0 and 100),
  state_score numeric not null,
  event_score numeric not null,
  jar_percent numeric not null,
  jar_units numeric not null,
  happiness integer not null,
  biggest_event text,
  payload jsonb not null default '{}'
);
create index if not exists misery_snapshots_season_idx on misery_snapshots (season, taken_at desc);

create table if not exists tear_jar_seasons (
  season integer primary key,
  final_percent numeric not null,
  final_units numeric not null,
  tears_collected bigint not null,
  overflowed boolean not null,
  archived_at timestamptz not null default now(),
  history jsonb not null default '[]'
);

-- ───────────── Content ─────────────
create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  url text not null unique,
  url_hash text not null unique,
  source text not null,
  original_headline text not null,
  original_summary text,
  published_at timestamptz,
  club text not null check (club in ('sunderland','newcastle')),
  category text not null,
  negativity numeric not null default 0,
  key_facts text[] not null default '{}',
  howay_headline text,
  howay_commentary text,
  rewrite_model text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  breaking boolean not null default false,
  shares integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists news_status_published_idx on news_articles (status, published_at desc);
create index if not exists news_category_idx on news_articles (category);

create table if not exists memes (
  id uuid primary key default gen_random_uuid(),
  source text not null,                      -- reddit | giphy | community
  source_id text,
  source_url text not null,
  url_hash text not null unique,
  media_url text,
  media_type text not null default 'image' check (media_type in ('image','gif','video','embed')),
  title text not null,
  author text,
  author_url text,
  licence_note text not null,
  geordie_caption text,
  score integer not null default 0,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  featured_on date unique,
  submitted_by text,                         -- community submissions: optional display name only
  shares integer not null default 0,
  discovered_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists memes_status_idx on memes (status, discovered_at desc);
create unique index if not exists memes_source_unique on memes (source, source_id) where source_id is not null;

create table if not exists banter (
  id uuid primary key default gen_random_uuid(),
  for_date date not null,
  kind text not null,
  text text not null,
  facts jsonb not null,
  generated_by text not null,                -- template | ai:<model> | admin
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (for_date, kind, text)
);
create index if not exists banter_date_idx on banter (for_date desc);

-- ───────────── Operations ─────────────
create table if not exists automation_logs (
  id bigserial primary key,
  job text not null,
  status text not null check (status in ('ok','error','skipped')),
  message text,
  meta jsonb not null default '{}',
  started_at timestamptz not null default now(),
  duration_ms integer
);
create index if not exists automation_logs_job_idx on automation_logs (job, started_at desc);

create table if not exists data_status (
  key text primary key,                      -- football, live, predictions, news, memes, banter, misery
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  meta jsonb not null default '{}'
);

create table if not exists rate_limits (
  bucket text primary key,
  count integer not null,
  window_start timestamptz not null
);

-- Atomic share counter used by the public share route (service role only).
create or replace function increment_shares(p_table text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_table = 'news_articles' then
    update news_articles set shares = shares + 1 where id = p_id;
  elsif p_table = 'memes' then
    update memes set shares = shares + 1 where id = p_id;
  end if;
end $$;
revoke all on function increment_shares(text, uuid) from public, anon, authenticated;

-- Fixed-window rate limiter (service role only).
create or replace function hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare c integer;
begin
  insert into rate_limits(bucket, count, window_start) values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rate_limits.count + 1 end,
    window_start = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now() else rate_limits.window_start end
  returning count into c;
  return c <= p_limit;
end $$;
revoke all on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;

-- ───────────── Row Level Security ─────────────
alter table clubs enable row level security;
alter table fixtures enable row level security;
alter table fixture_events enable row level security;
alter table standings enable row level security;
alter table model_runs enable row level security;
alter table predictions enable row level security;
alter table misery_snapshots enable row level security;
alter table tear_jar_seasons enable row level security;
alter table news_articles enable row level security;
alter table memes enable row level security;
alter table banter enable row level security;
alter table automation_logs enable row level security;
alter table data_status enable row level security;
alter table rate_limits enable row level security;

create policy "public read clubs" on clubs for select to anon, authenticated using (true);
create policy "public read fixtures" on fixtures for select to anon, authenticated using (true);
create policy "public read events" on fixture_events for select to anon, authenticated using (true);
create policy "public read standings" on standings for select to anon, authenticated using (true);
create policy "public read runs" on model_runs for select to anon, authenticated using (true);
create policy "public read predictions" on predictions for select to anon, authenticated using (true);
create policy "public read misery" on misery_snapshots for select to anon, authenticated using (true);
create policy "public read jar seasons" on tear_jar_seasons for select to anon, authenticated using (true);
create policy "public read published news" on news_articles for select to anon, authenticated using (status = 'published');
create policy "public read published memes" on memes for select to anon, authenticated using (status = 'published');
create policy "public read published banter" on banter for select to anon, authenticated using (status = 'published');
create policy "public read data status" on data_status for select to anon, authenticated using (true);
-- automation_logs and rate_limits: no public policies (service role bypasses RLS).
