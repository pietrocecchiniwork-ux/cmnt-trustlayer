## Goal
Add a PM-only entry point on the Milestones screen so a project manager can upload a contract, use a template, or add a milestone manually at any time after project creation — not just during the one-time setup flow.

## Background
- The three setup pages (`/document-upload`, `/template-select`, `/manual-milestone`) already read `currentProjectId` from `DemoProjectContext` and work standalone.
- Database RLS already restricts milestone INSERT/UPDATE to PMs. A trigger additionally locks non-PMs to only setting `status = 'in_review'`.
- The current UI has two gaps:
  1. Empty state shows only "no milestones" text — no action for PMs.
  2. Non-empty state has a small "add milestone" button that only links to manual entry and is visually easy to miss.

## Changes

### 1. PM-only empty-state CTA card
**File:** `src/pages/MilestonesList.tsx` (inside `PMClientSpine`)

When `ordered.length === 0` and `role === "pm"`, replace the current plain card with a white card offering three inline actions:

```
+ upload contract    → /document-upload
+ use a template     → /template-select
+ add manually       → /manual-milestone
```

Design: white background (`bg-white`), rounded-3xl (`rounded-3xl`), DM Mono labels (`font-mono text-[13px]`), no shadows, no gradients. Each action is a full-width pill button with a subtle border.

### 2. PM-only "+ add" sheet (non-empty state)
When `ordered.length > 0` and `role === "pm"`, replace the existing tiny "add milestone" button with a single `+ add` pill.

Tapping it opens a shadcn `Sheet` (bottom drawer on mobile) containing the same three actions:
- Upload contract
- Use a template
- Add manually

Each routes to its existing page. The sheet closes on selection.

### 3. Non-PM visibility
For roles other than `"pm"`, both the empty-state CTA and the `+ add` pill are hidden. The spine renders exactly as it does today.

## Out of scope
- `/document-upload` page logic, contract extraction, `contract_extractions` table
- `contracts` storage bucket, its RLS, or its existence
- `extract-milestones` edge function
- `tag-evidence`, ontology, training signals
- Routing changes (existing routes are used as-is)
- Data hooks or backend modifications
- Project owner / permission model (uses existing `role === "pm"` from `RoleContext`)

## Files changed
- `src/pages/MilestonesList.tsx` — add empty-state CTA, replace add button with `+ add` sheet

## Verification
- Log in as `pm@test.com` on a project with zero milestones → empty-state CTA visible, clicking each route works.
- Add one milestone → empty-state CTA disappears, `+ add` pill appears at bottom of spine.
- Open sheet, select each option → navigates to correct page, sheet closes.
- Log in as client/contractor on same project → no CTA, no `+ add` pill, spine unchanged.