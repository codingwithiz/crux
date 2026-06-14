-- Conviction Engine — semantic re-surfacing of the Thesis Ledger (pgvector)
-- Run after 0001_theses.sql. Embeddings = OpenAI text-embedding-3-small (1536 dims).

create extension if not exists vector;

alter table public.theses add column if not exists embedding vector(1536);

-- Per-user semantic search. SECURITY INVOKER (default) + RLS + explicit user
-- filter all scope results to the signed-in user.
create or replace function public.match_theses(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  topic text,
  statement text,
  confidence text,
  change_my_mind text,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    t.id, t.topic, t.statement, t.confidence, t.change_my_mind, t.created_at,
    1 - (t.embedding <=> query_embedding) as similarity
  from public.theses t
  where t.user_id = auth.uid()
    and t.embedding is not null
  order by t.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

-- Optional at scale (a personal ledger is small, so a seq scan is fine):
-- create index on public.theses using hnsw (embedding vector_cosine_ops);
