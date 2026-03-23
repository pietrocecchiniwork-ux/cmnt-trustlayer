
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('pm', 'contractor', 'trade', 'client');

-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('invited', 'confirmed', 'active');

-- Create enum for milestone status
CREATE TYPE public.milestone_status AS ENUM ('pending', 'in_progress', 'overdue', 'in_review', 'complete');

-- Create enum for milestone source
CREATE TYPE public.milestone_source AS ENUM ('manual', 'template', 'extracted');

-- Create enum for evidence channel
CREATE TYPE public.evidence_channel AS ENUM ('app', 'whatsapp');

-- Table: projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  start_date DATE,
  end_date DATE,
  total_budget NUMERIC DEFAULT 0,
  payment_mode BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Table: project_members
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  role public.app_role NOT NULL DEFAULT 'client',
  status public.member_status NOT NULL DEFAULT 'invited',
  invite_token UUID DEFAULT gen_random_uuid(),
  joined_at TIMESTAMPTZ
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Table: milestones
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  payment_value NUMERIC DEFAULT 0,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  created_from public.milestone_source NOT NULL DEFAULT 'manual',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Table: milestone_assignments
CREATE TABLE public.milestone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL
);
ALTER TABLE public.milestone_assignments ENABLE ROW LEVEL SECURITY;

-- Table: evidence
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel public.evidence_channel NOT NULL DEFAULT 'app',
  photo_url TEXT,
  note TEXT,
  ai_tags JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- Table: milestone_shifts
CREATE TABLE public.milestone_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  old_date DATE NOT NULL,
  new_date DATE NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ
);
ALTER TABLE public.milestone_shifts ENABLE ROW LEVEL SECURITY;

-- Table: payment_certificates
CREATE TABLE public.payment_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  certificate_url TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.payment_certificates ENABLE ROW LEVEL SECURITY;

-- Table: whatsapp_sessions
CREATE TABLE public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Table: audit_log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(_user_id UUID, _project_id UUID)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.project_members
  WHERE user_id = _user_id AND project_id = _project_id AND status = 'active'
  LIMIT 1
$$;

-- RLS Policies for projects
CREATE POLICY "Members can view projects" ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for project_members
CREATE POLICY "Members can view project members" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id) OR user_id = auth.uid());

CREATE POLICY "PMs can insert project members" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (public.get_project_role(auth.uid(), project_id) = 'pm' OR 
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()));

CREATE POLICY "PMs can update project members" ON public.project_members
  FOR UPDATE TO authenticated
  USING (public.get_project_role(auth.uid(), project_id) = 'pm');

CREATE POLICY "PMs can delete project members" ON public.project_members
  FOR DELETE TO authenticated
  USING (public.get_project_role(auth.uid(), project_id) = 'pm');

-- RLS Policies for milestones
CREATE POLICY "Members can view milestones" ON public.milestones
  FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "PMs can insert milestones" ON public.milestones
  FOR INSERT TO authenticated
  WITH CHECK (public.get_project_role(auth.uid(), project_id) = 'pm');

CREATE POLICY "PMs can update milestones" ON public.milestones
  FOR UPDATE TO authenticated
  USING (public.get_project_role(auth.uid(), project_id) = 'pm');

-- RLS Policies for milestone_assignments
CREATE POLICY "Members can view assignments" ON public.milestone_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.is_project_member(auth.uid(), m.project_id)
  ));

CREATE POLICY "PMs can manage assignments" ON public.milestone_assignments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.get_project_role(auth.uid(), m.project_id) = 'pm'
  ));

-- RLS Policies for evidence
CREATE POLICY "Members can view evidence" ON public.evidence
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.is_project_member(auth.uid(), m.project_id)
  ));

CREATE POLICY "Assigned users can submit evidence" ON public.evidence
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- RLS Policies for milestone_shifts
CREATE POLICY "Members can view shifts" ON public.milestone_shifts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.is_project_member(auth.uid(), m.project_id)
  ));

CREATE POLICY "PMs can manage shifts" ON public.milestone_shifts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.get_project_role(auth.uid(), m.project_id) = 'pm'
  ));

-- RLS Policies for payment_certificates
CREATE POLICY "Members can view certificates" ON public.payment_certificates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.is_project_member(auth.uid(), m.project_id)
  ));

CREATE POLICY "PMs can manage certificates" ON public.payment_certificates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.get_project_role(auth.uid(), m.project_id) = 'pm'
  ));

CREATE POLICY "PMs can update certificates" ON public.payment_certificates
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.id = milestone_id AND public.get_project_role(auth.uid(), m.project_id) = 'pm'
  ));

-- RLS for whatsapp_sessions (service role only)
CREATE POLICY "Service role only for whatsapp" ON public.whatsapp_sessions
  FOR ALL TO authenticated USING (false);

-- RLS for audit_log
CREATE POLICY "Members can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Authenticated users can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-photos', 'evidence-photos', true);

CREATE POLICY "Authenticated users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Anyone can view evidence photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidence-photos');
