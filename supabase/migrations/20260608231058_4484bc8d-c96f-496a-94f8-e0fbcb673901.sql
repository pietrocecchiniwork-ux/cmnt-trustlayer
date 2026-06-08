
GRANT SELECT ON public.work_packages TO authenticated;
GRANT SELECT ON public.milestone_work_packages TO authenticated;
GRANT SELECT ON public.work_package_tasks TO authenticated;
GRANT ALL ON public.work_packages TO service_role;
GRANT ALL ON public.milestone_work_packages TO service_role;
GRANT ALL ON public.work_package_tasks TO service_role;

ALTER TABLE public.work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_package_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read work packages"
  ON public.work_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read milestone work packages"
  ON public.milestone_work_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read work package tasks"
  ON public.work_package_tasks FOR SELECT TO authenticated USING (true);
