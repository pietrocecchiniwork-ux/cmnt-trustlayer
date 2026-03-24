-- ─── tasks table ───────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references milestones not null,
  name text not null,
  description text,
  position integer not null default 1,
  status text not null default 'pending' check (status in ('pending','in_progress','complete')),
  assigned_to uuid references auth.users,
  assigned_to_name text,
  assigned_role text,
  evidence_required boolean not null default true,
  completed_at timestamptz,
  completed_by uuid references auth.users,
  created_at timestamptz not null default now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can view tasks" ON tasks FOR SELECT
USING (milestone_id IN (
  SELECT m.id FROM milestones m
  JOIN project_members pm ON pm.project_id = m.project_id
  WHERE pm.user_id = auth.uid()
));

CREATE POLICY "project members can insert tasks" ON tasks FOR INSERT
WITH CHECK (true);

CREATE POLICY "project members can update tasks" ON tasks FOR UPDATE
USING (true);

-- ─── project_changes table ─────────────────────────────────────────────────

CREATE TABLE project_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  entity_type text not null, -- 'project', 'milestone', 'task', 'member', 'evidence', 'payment'
  entity_id uuid,
  entity_name text,
  change_type text not null, -- 'created', 'updated', 'deleted', 'assigned', 'completed', 'approved', 'rejected', 'shifted'
  changed_by uuid references auth.users,
  changed_by_name text,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz not null default now()
);

ALTER TABLE project_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can view changes" ON project_changes FOR SELECT
USING (project_id IN (
  SELECT project_id FROM project_members WHERE user_id = auth.uid()
));

CREATE POLICY "project members can insert changes" ON project_changes FOR INSERT
WITH CHECK (true);
