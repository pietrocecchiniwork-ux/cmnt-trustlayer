-- Milestone write permissions:
-- INSERT: PM only (existing policy unchanged)
-- UPDATE: PM unrestricted; assigned non-PM may only flip status → in_review
--
-- Replaces the previous "Assigned users can update own milestones" policy
-- (which had no column-level guard) with an RLS policy + BEFORE UPDATE trigger.

-- 1. Replace the broad policy with a permissive-but-scoped one.
DROP POLICY IF EXISTS "Assigned users can update own milestones" ON public.milestones;

CREATE POLICY "Assigned users can submit for review"
  ON public.milestones FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 2. The real enforcement: a non-PM may change ONLY status, and only to in_review.
CREATE OR REPLACE FUNCTION public.enforce_non_pm_milestone_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PMs are unrestricted (still subject to the PM UPDATE policy).
  IF get_project_role(auth.uid(), NEW.project_id) = 'pm' THEN
    RETURN NEW;
  END IF;

  -- Non-PM: every column except status must be unchanged.
  -- Add any auto-managed columns (e.g. updated_by) to the exclusions below.
  IF (to_jsonb(NEW) - 'status' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Only a PM can modify milestone fields; you may only change status.';
  END IF;

  -- Non-PM: the only status they can set is in_review.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'in_review' THEN
    RAISE EXCEPTION 'You can only submit a milestone for review (in_review).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_non_pm_milestone_lock ON public.milestones;
CREATE TRIGGER trg_enforce_non_pm_milestone_lock
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.enforce_non_pm_milestone_lock();
