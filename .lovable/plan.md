## Goal
Let a PM defer a suggested addition on `/document-upload` instead of forcing accept-or-dismiss in the moment. Deferred items survive across sessions and can be reviewed later from the Milestones screen.

## Changes

### 1. New table: `milestone_suggestions`
Stores deferred suggestions per project so they persist across sessions/devices.

Columns:
- `project_id` (uuid, FK projects)
- `phase_id` (text) — ontology phase id
- `phase_name` (text)
- `reason` (text)
- `status` (text, default `'deferred'`) — `'deferred' | 'accepted' | 'dismissed'`
- `deferred_by` (uuid, FK auth.users)
- `resolved_by` (uuid, nullable)
- `resolved_at` (timestamptz, nullable)
- standard `id`, `created_at`, `updated_at`

Unique `(project_id, phase_id)` so the same phase can't pile up duplicates.

RLS: only project members can read; only PMs (via `get_project_role`) can insert/update/delete. GRANTs to `authenticated` and `service_role`.

### 2. `/document-upload` — DocumentUpload.tsx
- Add a third button **"review later"** next to **accept** / **dismiss** in the suggested-additions list.
- Action: upsert row into `milestone_suggestions` with `status='deferred'`, remove from the local `suggestions` list, log signal `suggested_addition / deferred`.
- When the page loads, fetch existing `deferred` rows for the project and filter them out of the in-memory suggestions list so they don't reappear here (they live on the Milestones screen now).
- **Confirm guard**: if any suggestion is still in the in-memory list (i.e. neither accepted, dismissed, nor deferred), tapping "confirm milestones" first shows an inline warning row: "N suggestion(s) still to review — continue anyway?" with **continue** / **back**. No new dialog component.

### 3. Milestones screen — MilestonesList.tsx
- PM-only: fetch `milestone_suggestions` where `status='deferred'` for the current project.
- If count > 0, render a small banner above the spine: `N suggestion(s) to review` opening a `Sheet` (same pattern as the existing `+ add to project` sheet) listing each deferred suggestion with **accept** / **dismiss** buttons.
  - **accept**: insert a milestone (same shape as `acceptSuggestion` in DocumentUpload — phase_id, name, description=reason, default empty payment/date/assignee) then mark suggestion `status='accepted'`. PM still needs to edit due date / assignee in the milestone row afterwards.
  - **dismiss**: mark suggestion `status='dismissed'`.
- Non-PM roles see nothing.

## Out of scope
- Changes to `extract-milestones` edge function or how suggestions are originally generated.
- Email/notification when a suggestion is added.
- Bulk accept/dismiss in the review-later sheet.
- Routing, ontology, training-signal schema, contracts bucket, RLS on existing tables.

## Files changed
- `supabase/migrations/<timestamp>_milestone_suggestions.sql` — new table + RLS + grants
- `src/pages/DocumentUpload.tsx` — "review later" button, load deferred filter, pre-confirm warning
- `src/pages/MilestonesList.tsx` — PM-only deferred-suggestions banner + sheet

## Verification
- As PM: upload a contract that produces suggestions → tap "review later" on one → it disappears from the list, row visible in `milestone_suggestions` with `status='deferred'`.
- Tap "confirm" while another suggestion is still un-actioned → warning row appears, "continue" proceeds.
- Open `/milestones` → banner "1 suggestion to review" → open sheet → tap **accept** → new milestone appears in spine, suggestion row flips to `accepted`.
- As contractor/client on same project → no banner, no sheet.
