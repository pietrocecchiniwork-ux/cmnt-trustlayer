-- =============================================================================
-- TRUST SLICE  ·  feat/trust-slice
-- Project : nwshkwwjagsqembvuqrm  (confirm before applying)
-- Apply   : Lovable Cloud SQL editor — run once; idempotent where marked
-- Sections: A) minimum-evidence guardrail
--           B) AI-tag correction layer
--           C) consent capture (project + evidence only)
-- =============================================================================


-- =============================================================================
-- A.  MINIMUM-EVIDENCE GUARDRAIL
-- =============================================================================

-- DESIGN NOTE — why a separate trigger rather than extending
-- enforce_non_pm_milestone_lock():
--
--   1. Role enforcement and data-completeness are orthogonal invariants; mixing
--      them makes both harder to audit, test, and change independently.
--   2. The existing lock function passes PMs through unconditionally
--      (RETURN NEW).  Adding evidence logic there would need its own PM branch,
--      duplicating the complexity rather than isolating it.
--   3. PostgreSQL fires BEFORE triggers in name-alphabetical order.
--      "trg_enforce_non_pm_milestone_lock" (e) fires before
--      "trg_milestone_evidence_required" (m) — correct: role gate first,
--      then data-completeness gate.
--   4. The override path (approve_milestone sets a transaction-local session
--      variable that the backstop reads) is clean and self-contained without
--      touching the existing trigger at all.


-- A-1.  Backstop trigger: ≥1 photo required when status → 'complete'
--       Reads a transaction-local flag set by approve_milestone() on override.

CREATE OR REPLACE FUNCTION public.enforce_milestone_evidence_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Only relevant when status is being set to 'complete'
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status::text = 'complete' THEN

    -- approve_milestone() sets this flag before the UPDATE when p_override=true
    IF current_setting('app.approve_override', true) = 'true' THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM   public.evidence
    WHERE  milestone_id  = NEW.id
      AND  photo_url     IS NOT NULL
      AND  submitted_at  IS NOT NULL;

    IF v_count < 1 THEN
      RAISE EXCEPTION 'Cannot approve: at least one photo is required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_milestone_evidence_required ON public.milestones;
CREATE TRIGGER trg_milestone_evidence_required
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.enforce_milestone_evidence_required();


-- A-2.  approve_milestone() — PM-only, atomic, override-capable
--
--   • Uses auth.uid() as the actor; never trusts a caller-supplied id.
--   • Verifies PM role via get_project_role().
--   • Requires ≥1 evidence photo; allows override with mandatory justification.
--   • Sets status = 'complete' atomically (triggers fire as normal).
--   • Logs every call to project_changes; override justification goes in note.

CREATE OR REPLACE FUNCTION public.approve_milestone(
  p_milestone      uuid,
  p_override       boolean DEFAULT false,
  p_justification  text    DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor      uuid := auth.uid();
  v_project_id uuid;
  v_old_status text;
  v_ev_count   int;
BEGIN
  -- Must be authenticated
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and read the milestone row (prevents concurrent double-approval)
  SELECT project_id, status::text
  INTO   v_project_id, v_old_status
  FROM   public.milestones
  WHERE  id = p_milestone
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone % not found', p_milestone;
  END IF;

  -- Caller must be PM on the project
  IF public.get_project_role(v_actor, v_project_id) <> 'pm' THEN
    RAISE EXCEPTION 'Only a PM can approve milestones';
  END IF;

  -- Evidence check
  SELECT COUNT(*) INTO v_ev_count
  FROM   public.evidence
  WHERE  milestone_id = p_milestone
    AND  photo_url    IS NOT NULL
    AND  submitted_at IS NOT NULL;

  IF v_ev_count < 1 THEN
    IF NOT p_override THEN
      RAISE EXCEPTION 'Cannot approve: at least one photo is required';
    END IF;

    -- Override: justification is mandatory
    IF p_justification IS NULL OR trim(p_justification) = '' THEN
      RAISE EXCEPTION
        'A non-empty justification is required when overriding the evidence requirement';
    END IF;

    -- Signal the backstop trigger to allow this transaction only
    -- (true = local to current transaction; clears on commit/rollback)
    PERFORM set_config('app.approve_override', 'true', true);
  END IF;

  -- Atomically flip status — triggers fire here
  UPDATE public.milestones
  SET    status     = 'complete',
         updated_at = now()
  WHERE  id = p_milestone;

  -- Audit every approval in project_changes
  INSERT INTO public.project_changes (
    project_id,
    entity_type,
    entity_id,
    change_type,
    old_value,
    new_value,
    note,
    changed_by
  ) VALUES (
    v_project_id,
    'milestone',
    p_milestone::text,
    'status_changed',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'complete'),
    CASE
      WHEN p_override THEN 'Evidence override: ' || p_justification
      ELSE NULL
    END,
    v_actor
  );
END;
$$;

-- Any authenticated user may call; the function itself enforces the PM check.
GRANT EXECUTE ON FUNCTION public.approve_milestone(uuid, boolean, text) TO authenticated;


-- =============================================================================
-- B.  AI-TAG CORRECTION LAYER
-- =============================================================================

-- VERIFY result: ai_tags_original has NO immutability trigger in any migration
-- — only client convention.  This section adds the DB-level enforcement.

-- B-1.  New columns on evidence (idempotent)

ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS ai_tags_corrected     jsonb,
  ADD COLUMN IF NOT EXISTS ai_tags_corrected_by  uuid,
  ADD COLUMN IF NOT EXISTS ai_tags_corrected_at  timestamptz;


-- B-2.  Trigger: block updates to ai_tags_original once it is set

CREATE OR REPLACE FUNCTION public.enforce_ai_tags_original_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Once non-null, ai_tags_original must never change
  IF OLD.ai_tags_original IS NOT NULL
     AND NEW.ai_tags_original IS DISTINCT FROM OLD.ai_tags_original THEN
    RAISE EXCEPTION 'ai_tags_original is immutable once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_tags_original_immutable ON public.evidence;
CREATE TRIGGER trg_ai_tags_original_immutable
  BEFORE UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_tags_original_immutable();

-- Trigger fire order for evidence UPDATE (alphabetical by name):
--   1. trg_ai_tags_original_immutable  (a) — immutability check
--   2. trg_evidence_consent            (e) — consent immutability (added in C)
-- Both are BEFORE UPDATE; ordering is safe and deliberate.


-- B-3.  RPC: record_tag_correction()
--
--   • Writes p_corrected to ai_tags_corrected (+ _by, _at).
--   • Also updates ai_tags so existing reads reflect the correction.
--   • Logs a full diff to ontology_training_signals.
--
--   VERIFY result: ontology_training_signals columns are
--     id, project_id, extraction_id, signal_type, entity_id, action,
--     context (jsonb), user_id, created_at.
--   There are no dedicated original/corrected/milestone columns; those go
--   into the context jsonb.

CREATE OR REPLACE FUNCTION public.record_tag_correction(
  p_evidence   uuid,
  p_corrected  jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor        uuid := auth.uid();
  v_original     jsonb;
  v_milestone_id uuid;
  v_project_id   uuid;
  v_role         text;
BEGIN
  -- Must be authenticated
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read the evidence row (joins through milestone to get project)
  SELECT e.ai_tags_original, e.milestone_id, m.project_id
  INTO   v_original, v_milestone_id, v_project_id
  FROM   public.evidence e
  JOIN   public.milestones m ON m.id = e.milestone_id
  WHERE  e.id = p_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evidence % not found', p_evidence;
  END IF;

  -- Caller must be a project member (any role may submit corrections)
  IF NOT public.is_project_member(v_actor, v_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Capture role for the training signal
  v_role := public.get_project_role(v_actor, v_project_id)::text;

  -- Apply correction: update mutable ai_tags + correction audit columns.
  -- trg_ai_tags_original_immutable fires here but ai_tags_original is
  -- unchanged, so it passes cleanly.
  UPDATE public.evidence
  SET    ai_tags              = p_corrected,
         ai_tags_corrected    = p_corrected,
         ai_tags_corrected_by = v_actor,
         ai_tags_corrected_at = now()
  WHERE  id = p_evidence;

  -- Log to ontology_training_signals.
  -- original = ai_tags_original (the immutable AI output),
  -- corrected = what the human set.
  INSERT INTO public.ontology_training_signals (
    project_id,
    signal_type,
    entity_id,
    action,
    context,
    user_id
  ) VALUES (
    v_project_id,
    'tag_correction',
    p_evidence::text,
    'corrected',
    jsonb_build_object(
      'milestone_id',   v_milestone_id,
      'original',       v_original,
      'corrected',      p_corrected,
      'corrector_role', v_role
    ),
    v_actor
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_tag_correction(uuid, jsonb) TO authenticated;


-- =============================================================================
-- C.  CONSENT CAPTURE  (project-level tier + evidence-level snapshot)
-- =============================================================================

-- Scope: project data-license tier and a per-evidence snapshot only.
-- NOT built here (add later):
--   [USER-LEVEL CONSENT HOOK] — a user_consents table or profiles.consent_*
--   columns capturing individual data-sharing agreements.
--
--   [LICENSING ENFORCEMENT HOOK] — a view, RLS policy, export filter, or
--   append-only consent_events ledger that gates data export on
--   evidence.consent_status and project.data_license_tier.


-- C-1.  Enum types (idempotent)

DO $$ BEGIN
  CREATE TYPE public.data_license_tier AS ENUM (
    'none',
    'internal_only',
    'aggregated_anonymous',
    'full_licensable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_status AS ENUM (
    'granted',
    'pending',
    'withheld'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- C-2.  Data-license columns on projects (idempotent)
--       Default 'none' = opt-in by construction; no consent unless explicitly
--       set by the PM.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS data_license_tier     public.data_license_tier NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS data_license_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_license_signed_by uuid,
  ADD COLUMN IF NOT EXISTS data_license_version   text;


-- C-3.  consent_status on evidence (idempotent)
--       Default 'pending' so existing rows are safe; trigger sets the real
--       value on INSERT based on the project's tier.

ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS consent_status public.consent_status NOT NULL DEFAULT 'pending';


-- C-4.  Trigger: snapshot consent_status on INSERT; block UPDATE changes
--       Single function handles both ops via TG_OP.
--
--       Snapshot rule:
--         project.data_license_tier <> 'none'  →  'granted'
--         otherwise (none or no project found)  →  'pending'
--
--       Update rule: consent_status is immutable after the evidence row is
--       created. Changes to a project's tier do NOT retroactively update
--       existing evidence (snapshot semantics).

CREATE OR REPLACE FUNCTION public.manage_evidence_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier public.data_license_tier;
BEGIN
  -- ── INSERT: snapshot from the project's current tier ──────────────────────
  IF TG_OP = 'INSERT' THEN
    SELECT p.data_license_tier
    INTO   v_tier
    FROM   public.milestones m
    JOIN   public.projects   p ON p.id = m.project_id
    WHERE  m.id = NEW.milestone_id;

    NEW.consent_status := CASE
      WHEN v_tier IS NOT NULL AND v_tier <> 'none'
        THEN 'granted'::public.consent_status
      ELSE
        'pending'::public.consent_status
    END;

    RETURN NEW;
  END IF;

  -- ── UPDATE: consent_status is immutable ──────────────────────────────────
  IF TG_OP = 'UPDATE' THEN
    IF NEW.consent_status IS DISTINCT FROM OLD.consent_status THEN
      RAISE EXCEPTION 'consent_status is immutable after evidence submission';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evidence_consent ON public.evidence;
CREATE TRIGGER trg_evidence_consent
  BEFORE INSERT OR UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.manage_evidence_consent();

-- Trigger fire order for evidence (all BEFORE, alphabetical by name):
--   INSERT: trg_evidence_consent  (only BEFORE INSERT trigger)
--   UPDATE: trg_ai_tags_original_immutable (a) → trg_evidence_consent (e)
-- AFTER INSERT: trg_notify_evidence_submitted fires separately; unaffected.
