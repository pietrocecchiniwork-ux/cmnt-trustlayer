
-- Allow any active project member to invite new members (not just PMs)
CREATE POLICY "Members can invite to their projects"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_project_member(auth.uid(), project_id)
);
