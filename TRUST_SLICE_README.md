# Trust Slice — Run Order & Notes

Branch: `feat/trust-slice`
Project: `nwshkwwjagsqembvuqrm`

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260609000000_trust_slice.sql` | Schema + functions + triggers (apply this) |
| `supabase/migrations/20260609000001_trust_slice_verify.sql` | Read-only verification queries (run after) |

## Run order

1. **Confirm project ref** — check that the Lovable Cloud SQL editor is pointed at `nwshkwwjagsqembvuqrm` before running anything.

2. **Apply `20260609000000_trust_slice.sql`** in the Lovable Cloud SQL editor.
   The script is safe to run as a single transaction. All `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and enum creation (`DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`) are idempotent.

3. **Run `20260609000001_trust_slice_verify.sql`** (read-only) and confirm:
   - Query 1: `trg_milestone_evidence_required` appears on `milestones`
   - Query 2: `trg_ai_tags_original_immutable` and `trg_evidence_consent` appear on `evidence`
   - Query 3: 5 functions, all `prosecdef = true`
   - Query 4: 4 new columns on `evidence`
   - Query 5: 4 new columns on `projects`
   - Query 6: `data_license_tier` (4 labels) and `consent_status` (3 labels)
   - Query 7: both RPCs grant `EXECUTE` to `authenticated`

4. **Regenerate `types.ts`** in Lovable so the client gets the new columns and enums.

## What was NOT built (intentional)

- No edge-function changes — `tag-evidence` is untouched; the client continues to write evidence rows directly.
- No `profiles` table or user-level consent — hook points are marked with SQL comments in the migration.
- No backfill of existing `evidence.consent_status` beyond the column default (`pending`).
- No licensing enforcement view/RLS/export filter — marked in comments for a later slice.

## Key design notes

### A — Minimum-evidence guardrail

- `approve_milestone(p_milestone, p_override, p_justification)` is the intended approval path for PMs.
- Direct `UPDATE milestones SET status = 'complete'` from any client is caught by `trg_milestone_evidence_required`.
- Override uses a transaction-local session variable (`app.approve_override`) so the bypass cannot leak across transactions.
- Every call (normal or override) is logged to `project_changes`; override writes `note = 'Evidence override: <justification>'`.

### B — Correction layer

- `ai_tags` remains the mutable current value read by the UI.
- `ai_tags_original` is now DB-enforced immutable (trigger raises if changed once set).
- `record_tag_correction(p_evidence, p_corrected)` updates both `ai_tags` and the `ai_tags_corrected_*` columns atomically, then logs to `ontology_training_signals` with the full original/corrected diff and the corrector's role.

### C — Consent capture

- Project default is `data_license_tier = 'none'` — opt-in by construction.
- `evidence.consent_status` is snapshotted from the project's tier at INSERT time and is immutable thereafter.
- Changing a project's tier does NOT retroactively update existing evidence rows.
