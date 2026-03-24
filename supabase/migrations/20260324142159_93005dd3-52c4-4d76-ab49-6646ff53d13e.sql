CREATE POLICY "Users can join projects via code"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());