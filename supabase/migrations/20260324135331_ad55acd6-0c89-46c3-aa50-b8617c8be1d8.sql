
-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  assigned_to_name text,
  assigned_role text,
  evidence_required boolean NOT NULL DEFAULT false,
  due_date date,
  budget numeric,
  depends_on uuid REFERENCES public.tasks(id),
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_changes table
CREATE TABLE public.project_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  change_type text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m
    WHERE m.id = tasks.milestone_id
    AND public.is_project_member(auth.uid(), m.project_id)
  ));

CREATE POLICY "PMs can insert tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.milestones m
    WHERE m.id = tasks.milestone_id
    AND public.get_project_role(auth.uid(), m.project_id) = 'pm'
  ));

CREATE POLICY "PMs can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m
    WHERE m.id = tasks.milestone_id
    AND public.get_project_role(auth.uid(), m.project_id) = 'pm'
  ));

CREATE POLICY "Assigned users can update own tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid());

-- RLS for project_changes
ALTER TABLE public.project_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view changes" ON public.project_changes
  FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert changes" ON public.project_changes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- Indexes
CREATE INDEX idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX idx_project_changes_project_id ON public.project_changes(project_id);
CREATE INDEX idx_project_changes_entity_id ON public.project_changes(entity_id);
