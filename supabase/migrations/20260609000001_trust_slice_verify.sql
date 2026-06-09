-- =============================================================================
-- TRUST SLICE — verification queries
-- Run in Lovable Cloud SQL editor AFTER applying 20260609000000_trust_slice.sql
-- All queries are read-only (SELECT only).
-- =============================================================================


-- 1.  Triggers on milestones
--     Expect rows: trg_enforce_non_pm_milestone_lock, trg_milestone_evidence_required,
--                  trg_notify_milestone_status
SELECT tgname, tgenabled, tgtype
FROM   pg_trigger
WHERE  tgrelid = 'public.milestones'::regclass
ORDER  BY tgname;


-- 2.  Triggers on evidence
--     Expect rows: trg_ai_tags_original_immutable, trg_evidence_consent,
--                  trg_notify_evidence_submitted
SELECT tgname, tgenabled, tgtype
FROM   pg_trigger
WHERE  tgrelid = 'public.evidence'::regclass
ORDER  BY tgname;


-- 3.  Functions created by this migration
--     Expect 5 rows, all with prosecdef = true (SECURITY DEFINER)
SELECT proname, prosecdef
FROM   pg_proc
WHERE  proname IN (
         'approve_milestone',
         'enforce_milestone_evidence_required',
         'enforce_ai_tags_original_immutable',
         'record_tag_correction',
         'manage_evidence_consent'
       )
  AND  pronamespace = 'public'::regnamespace
ORDER  BY proname;


-- 4.  New columns on evidence
--     Expect 4 rows: ai_tags_corrected, ai_tags_corrected_at,
--                    ai_tags_corrected_by, consent_status
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'evidence'
  AND  column_name  IN (
         'ai_tags_corrected',
         'ai_tags_corrected_by',
         'ai_tags_corrected_at',
         'consent_status'
       )
ORDER  BY column_name;


-- 5.  New columns on projects
--     Expect 4 rows: data_license_signed_at, data_license_signed_by,
--                    data_license_tier, data_license_version
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'projects'
  AND  column_name  LIKE 'data_license%'
ORDER  BY column_name;


-- 6.  New enum types and their labels
--     Expect data_license_tier (4 values) and consent_status (3 values)
SELECT t.typname, e.enumlabel, e.enumsortorder
FROM   pg_type t
JOIN   pg_enum e ON e.enumtypid = t.oid
WHERE  t.typname IN ('data_license_tier', 'consent_status')
ORDER  BY t.typname, e.enumsortorder;


-- 7.  GRANT EXECUTE sanity check — both RPCs callable by authenticated
SELECT routine_name, grantee, privilege_type
FROM   information_schema.routine_privileges
WHERE  routine_schema = 'public'
  AND  routine_name   IN ('approve_milestone', 'record_tag_correction')
  AND  grantee        = 'authenticated';
