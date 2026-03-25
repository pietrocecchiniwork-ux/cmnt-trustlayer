-- Allow assigned users to update their own milestones (status transitions)
CREATE POLICY "Assigned users can update own milestones"
ON public.milestones
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid());