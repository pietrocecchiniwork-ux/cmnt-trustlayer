---
name: Contract parsing (Task C)
description: Document upload → editable milestones with ontology-driven suggestions, payment docs, capture warnings, training signals
type: feature
---
Route `/document-upload` (`src/pages/DocumentUpload.tsx`).

Flow:
1. User uploads contract → `extract-milestones` edge function returns `{ project_type, milestones[] }`. Each milestone has optional `phase_id` mapped to canonical PH-xxx.
2. A `contract_extractions` row is created with `parsed_status='parsed'`.
3. UI shows three derived blocks per row using `src/data/ontology/payment-evidence.ts`:
   - **Suggested additions**: `getSuggestedMissingPhases(project_type, presentPhaseIds)` — phases expected for the detected project type but absent from extraction.
   - **Docs needed for payment**: `getPaymentDocsForPhase(phase_id)` — pill list of EVIDENCE_TYPES from a hand-mapped phase→evidence table. Stored in milestone `checklist` jsonb on confirm.
   - **Capture-before-covered warnings**: `getCaptureWarningsForPhase(phase_id)` — derived from `SEQUENCE_RULES` where `irreversible=true` and the row's phase is the predecessor.
4. All blocks are **advisory only** — copy must include "confirm with your CA". Never compliant/non-compliant.
5. Accept / dismiss / row-removal log to `ontology_training_signals` (signal_type: `suggested_addition` | `capture_warning` | `extracted_milestone`).
6. On Confirm: loops `useCreateMilestone`, logs project_changes, then `UPDATE contract_extractions SET parsed_status='confirmed', confirmed_at=now()`.

Edge function: `supabase/functions/extract-milestones/index.ts` — returns object shape `{ project_type, milestones }` (tolerates legacy array consumers).
