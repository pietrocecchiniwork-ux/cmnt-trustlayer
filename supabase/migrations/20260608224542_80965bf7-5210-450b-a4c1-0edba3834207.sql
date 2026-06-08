CREATE TABLE public.milestone_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id text NOT NULL,
  phase_name text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'deferred',
  deferred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, phase_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_suggestions TO authenticated;
GRANT ALL ON public.milestone_suggestions TO service_role;

ALTER TABLE public.milestone_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view milestone suggestions"
  ON public.milestone_suggestions FOR SELECT
  TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "PMs can insert milestone suggestions"
  ON public.milestone_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.get_project_role(auth.uid(), project_id) = 'pm');

CREATE POLICY "PMs can update milestone suggestions"
  ON public.milestone_suggestions FOR UPDATE
  TO authenticated
  USING (public.get_project_role(auth.uid(), project_id) = 'pm')
  WITH CHECK (public.get_project_role(auth.uid(), project_id) = 'pm');

CREATE POLICY "PMs can delete milestone suggestions"
  ON public.milestone_suggestions FOR DELETE
  TO authenticated
  USING (public.get_project_role(auth.uid(), project_id) = 'pm');

CREATE OR REPLACE FUNCTION public.update_milestone_suggestions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_milestone_suggestions_updated_at
  BEFORE UPDATE ON public.milestone_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_milestone_suggestions_updated_at();