
CREATE OR REPLACE FUNCTION public.notify_task_added_to_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m_assignee UUID;
  p_id UUID;
  p_name TEXT;
  m_name TEXT;
  recipient UUID;
BEGIN
  SELECT m.assigned_to, m.project_id, m.name, p.name
    INTO m_assignee, p_id, m_name, p_name
  FROM public.milestones m
  JOIN public.projects p ON p.id = m.project_id
  WHERE m.id = NEW.milestone_id;

  -- Notify milestone assignee (if any, and not the actor, and not same as task assignee since that's covered)
  IF m_assignee IS NOT NULL
     AND m_assignee <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND m_assignee IS DISTINCT FROM NEW.assigned_to THEN
    PERFORM public.insert_notification(
      m_assignee, p_id, 'task_assigned',
      'New task added to your milestone',
      COALESCE(NEW.name, 'A task') || COALESCE(' · ' || COALESCE(m_name, p_name), ''),
      '/project/milestone/' || NEW.milestone_id::text,
      jsonb_build_object('task_id', NEW.id, 'milestone_id', NEW.milestone_id)
    );
  END IF;

  -- Notify other active members assigned to sibling tasks on this milestone
  FOR recipient IN
    SELECT DISTINCT t.assigned_to FROM public.tasks t
    WHERE t.milestone_id = NEW.milestone_id
      AND t.id <> NEW.id
      AND t.assigned_to IS NOT NULL
      AND t.assigned_to <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      AND t.assigned_to IS DISTINCT FROM NEW.assigned_to
      AND t.assigned_to IS DISTINCT FROM m_assignee
  LOOP
    PERFORM public.insert_notification(
      recipient, p_id, 'task_assigned',
      'New task added to a milestone you''re working on',
      COALESCE(NEW.name, 'A task') || COALESCE(' · ' || COALESCE(m_name, p_name), ''),
      '/project/milestone/' || NEW.milestone_id::text,
      jsonb_build_object('task_id', NEW.id, 'milestone_id', NEW.milestone_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_added_to_milestone ON public.tasks;
CREATE TRIGGER trg_notify_task_added_to_milestone
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_added_to_milestone();
