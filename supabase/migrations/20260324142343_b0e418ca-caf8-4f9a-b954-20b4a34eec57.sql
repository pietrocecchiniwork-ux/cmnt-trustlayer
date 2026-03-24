-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Anyone can lookup by project_code" ON public.projects;

-- Create a security definer function for project code lookup
CREATE OR REPLACE FUNCTION public.lookup_project_by_code(_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.projects p
  WHERE p.project_code = _code
  LIMIT 1;
$$;