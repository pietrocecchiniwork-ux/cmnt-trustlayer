
-- 1. Drop overly permissive public listing on evidence-photos (files still served via public URL)
DROP POLICY IF EXISTS "Anyone can view evidence photos" ON storage.objects;

-- 2. Add UPDATE policy on contracts bucket
CREATE POLICY "PMs and clients can update contract files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contracts'
  AND public.get_project_role(auth.uid(), ((storage.foldername(name))[1])::uuid) = ANY (ARRAY['pm'::public.app_role, 'client'::public.app_role])
)
WITH CHECK (
  bucket_id = 'contracts'
  AND public.get_project_role(auth.uid(), ((storage.foldername(name))[1])::uuid) = ANY (ARRAY['pm'::public.app_role, 'client'::public.app_role])
);

-- 3. Add UPDATE policy on project-knowledge bucket
CREATE POLICY "PMs update project-knowledge files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-knowledge'
  AND public.get_project_role(auth.uid(), ((storage.foldername(name))[1])::uuid) = 'pm'::public.app_role
)
WITH CHECK (
  bucket_id = 'project-knowledge'
  AND public.get_project_role(auth.uid(), ((storage.foldername(name))[1])::uuid) = 'pm'::public.app_role
);

-- 4. Restrict invite_token visibility (never read client-side) and clear it once invitation accepted
REVOKE SELECT (invite_token) ON public.project_members FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.clear_invite_token_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.invite_token IS NOT NULL THEN
    NEW.invite_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_invite_token ON public.project_members;
CREATE TRIGGER trg_clear_invite_token
BEFORE INSERT OR UPDATE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.clear_invite_token_on_activation();

-- Clear stale tokens on already-active rows
UPDATE public.project_members SET invite_token = NULL WHERE status = 'active' AND invite_token IS NOT NULL;

-- 5. Tighten Realtime policy: members can only subscribe to projects they belong to
DROP POLICY IF EXISTS "Users subscribe to own topic" ON realtime.messages;
CREATE POLICY "Users subscribe to own topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR (
    realtime.topic() LIKE 'project:%'
    AND public.is_project_member(auth.uid(), replace(realtime.topic(), 'project:', '')::uuid)
  )
);
