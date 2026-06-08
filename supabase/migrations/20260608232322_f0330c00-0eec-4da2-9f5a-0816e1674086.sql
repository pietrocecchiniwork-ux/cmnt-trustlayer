
-- ============ notifications ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============ notification_preferences ============
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_notif_prefs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_notif_prefs_updated_at();

-- ============ helper: should_send_inapp ============
CREATE OR REPLACE FUNCTION public.should_send_inapp(_user_id UUID, _event_type TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT in_app FROM public.notification_preferences
     WHERE user_id = _user_id AND event_type = _event_type LIMIT 1),
    true
  );
$$;

-- ============ helper: insert_notification ============
CREATE OR REPLACE FUNCTION public.insert_notification(
  _user_id UUID, _project_id UUID, _type TEXT, _title TEXT, _body TEXT,
  _link TEXT, _metadata JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  IF NOT public.should_send_inapp(_user_id, _type) THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, project_id, type, title, body, link, metadata)
  VALUES (_user_id, _project_id, _type, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- ============ trigger: project_members ============
CREATE OR REPLACE FUNCTION public.notify_project_member_added()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = auth.uid() THEN RETURN NEW; END IF;
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
CREATE TRIGGER trg_notify_project_member_added
  AFTER INSERT ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_added();

-- ============ trigger: tasks (assignment) ============
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_assignee UUID; p_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_assignee := NEW.assigned_to;
  ELSE
    IF NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF;
    new_assignee := NEW.assigned_to;
  END IF;
  IF new_assignee IS NULL OR new_assignee = auth.uid() THEN RETURN NEW; END IF;
  SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;
  PERFORM public.insert_notification(
    new_assignee, NEW.project_id, 'task_assigned',
    'New task assigned',
    COALESCE(NEW.title, 'A task') || COALESCE(' · ' || p_name, ''),
    '/project/task/' || NEW.id::text,
    jsonb_build_object('task_id', NEW.id)
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_task_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- ============ trigger: milestones (status changes) ============
CREATE OR REPLACE FUNCTION public.notify_milestone_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pm_user UUID; p_name TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT name INTO p_name FROM public.projects WHERE id = NEW.project_id;

  IF NEW.status = 'in_review' THEN
    FOR pm_user IN
      SELECT user_id FROM public.project_members
      WHERE project_id = NEW.project_id AND role = 'pm' AND status = 'active' AND user_id IS NOT NULL
    LOOP
      IF pm_user <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.insert_notification(
          pm_user, NEW.project_id, 'milestone_submitted',
          'Milestone submitted for review',
          COALESCE(NEW.name, 'A milestone') || COALESCE(' · ' || p_name, ''),
          '/project/milestone/' || NEW.id::text,
          jsonb_build_object('milestone_id', NEW.id)
        );
      END IF;
    END LOOP;
  ELSIF NEW.status = 'complete' AND NEW.assigned_to IS NOT NULL THEN
    PERFORM public.insert_notification(
      NEW.assigned_to, NEW.project_id, 'milestone_approved',
      'Milestone approved',
      COALESCE(NEW.name, 'A milestone') || COALESCE(' · ' || p_name, ''),
      '/project/milestone/' || NEW.id::text,
      jsonb_build_object('milestone_id', NEW.id)
    );
  ELSIF NEW.status = 'rejected' AND NEW.assigned_to IS NOT NULL THEN
    PERFORM public.insert_notification(
      NEW.assigned_to, NEW.project_id, 'milestone_rejected',
      'Milestone needs more evidence',
      COALESCE(NEW.name, 'A milestone') || COALESCE(' · ' || p_name, ''),
      '/project/milestone/' || NEW.id::text,
      jsonb_build_object('milestone_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_milestone_status
  AFTER UPDATE OF status ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_status();

-- ============ trigger: evidence (new submission -> PMs) ============
CREATE OR REPLACE FUNCTION public.notify_evidence_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pm_user UUID; m_proj UUID; m_name TEXT;
BEGIN
  SELECT project_id, name INTO m_proj, m_name FROM public.milestones WHERE id = NEW.milestone_id;
  IF m_proj IS NULL THEN RETURN NEW; END IF;
  FOR pm_user IN
    SELECT user_id FROM public.project_members
    WHERE project_id = m_proj AND role = 'pm' AND status = 'active' AND user_id IS NOT NULL
  LOOP
    IF pm_user <> COALESCE(NEW.submitted_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.insert_notification(
        pm_user, m_proj, 'evidence_submitted',
        'New evidence submitted',
        COALESCE(m_name, 'A milestone'),
        '/project/milestone/' || NEW.milestone_id::text,
        jsonb_build_object('evidence_id', NEW.id, 'milestone_id', NEW.milestone_id)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_evidence_submitted
  AFTER INSERT ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.notify_evidence_submitted();

-- ============ trigger: payment_certificates ============
CREATE OR REPLACE FUNCTION public.notify_payment_certificate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID; m_name TEXT; m_proj UUID;
BEGIN
  SELECT project_id, name INTO m_proj, m_name FROM public.milestones WHERE id = NEW.milestone_id;

  IF TG_OP = 'INSERT' THEN
    -- notify clients that a certificate is awaiting authorization
    FOR recipient IN
      SELECT user_id FROM public.project_members
      WHERE project_id = m_proj AND role = 'client' AND status = 'active' AND user_id IS NOT NULL
    LOOP
      IF recipient <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.insert_notification(
          recipient, m_proj, 'payment_authorized',
          'Payment certificate ready',
          COALESCE(m_name, 'A milestone'),
          '/project/payment-certificate/' || NEW.milestone_id::text,
          jsonb_build_object('certificate_id', NEW.id, 'milestone_id', NEW.milestone_id)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_payment_cert
  AFTER INSERT ON public.payment_certificates
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_certificate();
