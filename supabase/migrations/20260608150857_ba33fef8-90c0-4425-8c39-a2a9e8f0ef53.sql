
-- Allow global (project-less) knowledge documents and chunks
alter table public.project_documents alter column project_id drop not null;
alter table public.project_documents add column if not exists is_global boolean not null default false;
alter table public.knowledge_chunks alter column project_id drop not null;
alter table public.knowledge_chunks add column if not exists source_key text;
create unique index if not exists knowledge_chunks_source_key_idx on public.knowledge_chunks(source_key) where source_key is not null;

-- Allow all authenticated users to read global chunks (project_id is null)
create policy "Anyone reads global knowledge chunks"
  on public.knowledge_chunks for select
  to authenticated
  using (project_id is null);

create policy "Anyone reads global project documents"
  on public.project_documents for select
  to authenticated
  using (is_global = true);

-- New unified match function returning both project and global chunks
create or replace function public.match_chunks(
  _project_id uuid,
  _query_embedding vector(1536),
  _match_count integer default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  similarity float,
  is_global boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    -- Slight penalty for global chunks so project-specific wins on ties
    (1 - (c.embedding <=> _query_embedding)) - case when c.project_id is null then 0.02 else 0 end as similarity,
    (c.project_id is null) as is_global
  from public.knowledge_chunks c
  where c.embedding is not null
    and (
      (_project_id is not null and c.project_id = _project_id)
      or c.project_id is null
    )
  order by similarity desc
  limit _match_count;
$$;

grant execute on function public.match_chunks(uuid, vector, integer) to authenticated, service_role;
