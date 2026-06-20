-- Adds a planned publish date to carousels (drives the Queue / content calendar).
-- Anonymous (localStorage) users get scheduling for free; this is only needed for
-- signed-in cloud sync.
alter table public.carousels
  add column if not exists scheduled_at timestamptz;
