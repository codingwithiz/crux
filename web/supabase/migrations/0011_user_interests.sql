-- Crux — the topics you want to hear about, in your own words.
-- Run after 0010_thesis_synthesis.sql.
--
-- Feed ranking blends popularity with overlap against your committed theses. On
-- day one you have none, so the personal half of the signal is dead exactly when
-- a new user is deciding whether the feed is worth anything. Interests give that
-- half something to work with immediately.
--
-- Lives on user_voice rather than its own table: voice, tone, and interests are
-- all "who I am" data keyed one-row-per-user, and saveVoice already upserts the
-- whole row — a second writer on the same primary key would race it. jsonb to
-- match the existing `samples` column.

alter table public.user_voice
  add column if not exists interests jsonb not null default '[]'::jsonb;
