
CREATE POLICY "PMs can update evidence"
ON public.evidence
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM milestones m
    WHERE m.id = evidence.milestone_id
    AND get_project_role(auth.uid(), m.project_id) = 'pm'::app_role
  )
);

CREATE POLICY "Clients can update evidence"
ON public.evidence
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM milestones m
    WHERE m.id = evidence.milestone_id
    AND get_project_role(auth.uid(), m.project_id) = 'client'::app_role
  )
);
