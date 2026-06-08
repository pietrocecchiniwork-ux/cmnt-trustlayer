
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_assignee UUID;
  p_id UUID;
  p_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_assignee := NEW.assigned_to;
  ELSE
    IF NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF;
    new_assignee := NEW.assigned_to;
  END IF;
  IF new_assignee IS NULL OR new_assignee = auth.uid() THEN RETURN NEW; END IF;

  SELECT m.project_id, p.name INTO p_id, p_name
  FROM public.milestones m
  JOIN public.projects p ON p.id = m.project_id
  WHERE m.id = NEW.milestone_id;

  PERFORM public.insert_notification(
    new_assignee, p_id, 'task_assigned',
    'New task assigned',
    COALESCE(NEW.name, 'A task') || COALESCE(' · ' || p_name, ''),
    '/project/task/' || NEW.id::text,
    jsonb_build_object('task_id', NEW.id)
  );
  RETURN NEW;
END $function$;
