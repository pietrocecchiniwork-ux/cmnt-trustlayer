
-- Enable pgvector
create extension if not exists vector;

-- project_documents
create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid,
  title text not null,
  kind text not null default 'other',
  file_path text not null,
  mime_type text,
  byte_size bigint,
  status text not null default 'processing',
  error text,
  created_at timestamptz not null default now()
);

create index project_documents_project_id_idx on public.project_documents(project_id);

grant select, insert, update, delete on public.project_documents to authenticated;
grant all on public.project_documents to service_role;

alter table public.project_documents enable row level security;

create policy "Members read project documents"
  on public.project_documents for select
  to authenticated
  using (public.is_project_member(auth.uid(), project_id));

create policy "Members insert project documents"
  on public.project_documents for insert
  to authenticated
  with check (public.is_project_member(auth.uid(), project_id) and uploaded_by = auth.uid());

create policy "Members update own project documents"
  on public.project_documents for update
  to authenticated
  using (public.is_project_member(auth.uid(), project_id));

create policy "PMs delete project documents"
  on public.project_documents for delete
  to authenticated
  using (public.get_project_role(auth.uid(), project_id) = 'pm');

-- knowledge_chunks
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.project_documents(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  token_estimate integer,
  created_at timestamptz not null default now()
);

create index knowledge_chunks_document_id_idx on public.knowledge_chunks(document_id);
create index knowledge_chunks_project_id_idx on public.knowledge_chunks(project_id);
create index knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

grant select on public.knowledge_chunks to authenticated;
grant all on public.knowledge_chunks to service_role;

alter table public.knowledge_chunks enable row level security;

create policy "Members read knowledge chunks"
  on public.knowledge_chunks for select
  to authenticated
  using (public.is_project_member(auth.uid(), project_id));

-- Match function: top-k chunks for a project by cosine similarity
create or replace function public.match_project_chunks(
  _project_id uuid,
  _query_embedding vector(1536),
  _match_count integer default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  similarity float
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
    1 - (c.embedding <=> _query_embedding) as similarity
  from public.knowledge_chunks c
  where c.project_id = _project_id
    and c.embedding is not null
  order by c.embedding <=> _query_embedding
  limit _match_count;
$$;

grant execute on function public.match_project_chunks(uuid, vector, integer) to authenticated, service_role;

-- Storage policies for project-knowledge bucket
-- Path convention: {project_id}/{document_id}.{ext}
create policy "Members read project-knowledge files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-knowledge'
    and public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy "Members upload project-knowledge files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-knowledge'
    and public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy "PMs delete project-knowledge files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-knowledge'
    and public.get_project_role(auth.uid(), ((storage.foldername(name))[1])::uuid) = 'pm'
  );
