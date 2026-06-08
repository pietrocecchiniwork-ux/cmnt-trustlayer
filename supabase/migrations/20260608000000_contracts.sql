-- contracts: tracks uploaded contract files and their parse pipeline state.
-- Files live in the private 'contracts' Storage bucket.
-- parsed_status FSM: uploaded → parsing → review → confirmed | error

-- ── Storage bucket ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Only active project members can upload into the folder for their project
CREATE POLICY "project members can upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND exists (
      select 1 from public.project_members pm
      where pm.project_id = (storage.foldername(name))[1]::uuid
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  );

-- Only active project members can download their project's contracts
CREATE POLICY "project members can read contracts storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND exists (
      select 1 from public.project_members pm
      where pm.project_id = (storage.foldername(name))[1]::uuid
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  );

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists public.contracts (
  id              uuid default gen_random_uuid() primary key,
  project_id      uuid not null references public.projects(id) on delete cascade,
  file_name       text,                          -- original filename for display
  file_path       text not null,                 -- storage path: {project_id}/{contract_id}/{filename}
  parsed_status   text not null default 'uploaded'
                    check (parsed_status in ('uploaded', 'parsing', 'review', 'confirmed', 'error')),
  parsed_result   jsonb,                         -- { milestones[], flags } from extract-milestones
  error_message   text,                          -- set when parsed_status = 'error'
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);

create index if not exists contracts_project_id_idx on public.contracts(project_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.contracts enable row level security;

create policy "project members can read contracts"
  on public.contracts for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = contracts.project_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  );

create policy "project members can insert contracts"
  on public.contracts for insert
  with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = contracts.project_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  );

create policy "project members can update contracts"
  on public.contracts for update
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = contracts.project_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  );
