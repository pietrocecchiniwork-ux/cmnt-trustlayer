
CREATE OR REPLACE FUNCTION public.notify_project_member_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p_name TEXT;
BEGIN
  -- Fire only when an invite is claimed (user_id goes from NULL -> set)
  IF OLD.user_id IS NOT NULL OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;
  PERFORM public.insert_notification(
    NEW.user_id, NEW.project_id, 'project_invite',
    'Added to ' || COALESCE(p_name, 'a project'),
    'You were added as ' || COALESCE(NEW.role::text, 'member'),
    '/project/dashboard',
    jsonb_build_object('role', NEW.role, 'project_id', NEW.project_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_project_member_claimed ON public.project_members;
CREATE TRIGGER trg_notify_project_member_claimed
  AFTER UPDATE OF user_id ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_claimed();
