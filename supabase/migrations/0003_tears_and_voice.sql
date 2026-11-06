-- Tears Index: official attendances (when the supplier provides them).
alter table fixtures add column if not exists attendance integer;
-- Newsroom: separate punchline and story type, so satire and facts are stored apart.
alter table news_articles add column if not exists howay_punchline text;
alter table news_articles add column if not exists story_type text;
