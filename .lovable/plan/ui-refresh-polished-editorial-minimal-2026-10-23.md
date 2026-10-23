# UI Refresh — Polished Editorial Minimal

Four steps, done in order, each shippable on its own. Visual rules stay as saved: cream background, white 24px cards, pill buttons, DM Mono labels, DM Sans headings, no shadows or gradients. No backend, permission, or data changes.

## Step 1 — App shell and navigation
- Floating bottom dock: rounded pill bar inset from screen edges, active tab as a filled pill with icon + label, inactive as icon only.
- New top context bar on every in-project screen: active project name (opens the existing project switcher), role chip (PM / Contractor / Client), and notification bell with unread count.
- Assistant button repositioned so it never overlaps the dock.
- Replace hardcoded gray colors in the nav with theme colors.

## Step 2 — Role-aware project home (/project/dashboard)
- Top "Action required" card: the single most urgent thing for this role (PM: evidence to review; Contractor: next task due; Client: payment awaiting authorisation), with one primary button.
- Below it: a short "today" strip (counts of pending, in review, overdue).
- Then milestone stage cards: number, name, progress bar, status dot, next due date; tap opens the milestone.
- Existing role views keep their data; only layout and hierarchy change.

## Step 3 — Milestone and task detail
- Header card: milestone name, stage, status pill, assignee, due date, progress.
- Tasks grouped in collapsible sections (to do / in progress / done).
- Recommended tasks shown as compact chips with M / C / BP badge and add / edit / dismiss; concealment warning kept visible.
- Evidence shown as a thumbnail grid opening the existing photo viewer.
- Task detail page restyled to match (cards instead of divider lines, pill action buttons).

## Step 4 — Evidence capture and review
- Review sheet: large photo, AI tags and location beside it on desktop, stacked on mobile.
- Before/after side-by-side when a milestone has earlier evidence.
- Clear sticky "Approve" and "Request revision" buttons; revision requires a short note.
- Capture confirmation screen restyled to the same card system.

## Technical details
- Add tokens in `src/index.css` / `tailwind.config.ts` for dock surface, card radius (24px), and status tints; remove `gray-*` utilities from touched components.
- Files by step: 1) `AppLayout.tsx`, `BottomNav.tsx`, new `TopContextBar.tsx`, `AssistantFab.tsx`; 2) `Dashboard.tsx` (+ small new card components); 3) `MilestoneDetailPage.tsx`, `RecommendedTasks.tsx`, `TaskDetail.tsx`; 4) `EvidenceConfirm.tsx`, `EvidenceList.tsx`, `PhotoLightbox.tsx`.
- Reuse existing hooks and approval/state-machine logic unchanged; change logging and evidence-gated approval untouched.
- Verify each step with screenshots at mobile and desktop widths signed in as PM, contractor and client.
