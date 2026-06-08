
CREATE TABLE public.contract_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  filename text,
  parsed_status text NOT NULL DEFAULT 'parsed',
  project_type text,
  raw_payload jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_extractions TO authenticated;
GRANT ALL ON public.contract_extractions TO service_role;
ALTER TABLE public.contract_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_extractions read" ON public.contract_extractions
  FOR SELECT TO authenticated USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "contract_extractions insert" ON public.contract_extractions
  FOR INSERT TO authenticated WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "contract_extractions update" ON public.contract_extractions
  FOR UPDATE TO authenticated USING (public.is_project_member(auth.uid(), project_id));

CREATE TABLE public.ontology_training_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  extraction_id uuid REFERENCES public.contract_extractions(id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  context jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ontology_training_signals TO authenticated;
GRANT ALL ON public.ontology_training_signals TO service_role;
ALTER TABLE public.ontology_training_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ontology_signals read" ON public.ontology_training_signals
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR public.is_project_member(auth.uid(), project_id));
CREATE POLICY "ontology_signals insert" ON public.ontology_training_signals
  FOR INSERT TO authenticated
  WITH CHECK (project_id IS NULL OR public.is_project_member(auth.uid(), project_id));
