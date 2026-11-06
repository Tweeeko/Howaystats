-- The Monte Carlo seed is an unsigned 32-bit number (up to 4,294,967,295); a signed integer column
-- overflowed for about half of all seeds, so the predictions job never completed.
alter table model_runs alter column seed type bigint;
-- Why a rewrite was held back (shown in /admin), so failures aren't silent.
alter table news_articles add column if not exists rewrite_note text;
