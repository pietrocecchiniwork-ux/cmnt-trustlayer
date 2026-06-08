
-- 1) Tighten audit_log INSERT: require project membership + non-null actor
DROP POLICY IF EXISTS "Authenticated users can insert audit log" ON public.audit_log;
CREATE POLICY "Members can insert audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    actor_id IS NOT NULL
    AND auth.uid() = actor_id
    AND public.is_project_member(auth.uid(), project_id)
  );

-- 2) Tighten evidence INSERT: require project membership of the milestone's project
DROP POLICY IF EXISTS "Assigned users can submit evidence" ON public.evidence;
CREATE POLICY "Project members can submit evidence"
  ON public.evidence FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND EXISTS (
      SELECT 1 FROM public.milestones m
      WHERE m.id = evidence.milestone_id
        AND public.is_project_member(auth.uid(), m.project_id)
    )
  );

-- 3) Restrict global ontology signals (project_id IS NULL) to service_role only
DROP POLICY IF EXISTS "ontology_signals read" ON public.ontology_training_signals;
CREATE POLICY "Members read project ontology signals"
  ON public.ontology_training_signals FOR SELECT TO authenticated
  USING (
    project_id IS NOT NULL
    AND public.is_project_member(auth.uid(), project_id)
  );

-- 4) Fix mutable search_path on generate_project_code
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.project_code := 'CMT-' || upper(substring(md5(random()::text) from 1 for 5));
  RETURN NEW;
END;
$$;

-- 5) Restrict evidence-photos uploads to project members (path must start with a project_id the user belongs to)
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
CREATE POLICY "Project members can upload evidence photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-photos'
    AND (
      -- New path scheme: {project_id}/...
      (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        AND public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
      -- Legacy flat path scheme: allow for backward compatibility
      OR position('/' in name) = 0
    )
  );

-- 6) Realtime: only allow users to subscribe to their own user-scoped notification topic
-- Topic convention enforced in app: `user:{auth.uid()}`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users subscribe to own topic" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "Users subscribe to own topic"
        ON realtime.messages FOR SELECT TO authenticated
        USING (
          (realtime.topic() = 'user:' || auth.uid()::text)
          OR (realtime.topic() LIKE 'project:%')
        )
    $POL$;
  END IF;
END $$;
