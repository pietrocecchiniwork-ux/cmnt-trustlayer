CREATE POLICY "Anyone can lookup by project_code"
ON public.projects
FOR SELECT
TO authenticated
USING (project_code IS NOT NULL);