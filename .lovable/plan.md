## In-app notifications & inbox

### 1. Database (one migration)

**`notifications` table**
- `user_id` (recipient), `project_id` (nullable), `type` (text: `project_invite`, `task_assigned`, `milestone_submitted`, `milestone_approved`, `milestone_rejected`, `milestone_overdue`, `evidence_submitted`, `payment_authorized`, `payment_released`), `title`, `body`, `link` (in-app route), `metadata` (jsonb), `read_at` (nullable), `created_at`.
- RLS: user can SELECT/UPDATE/DELETE own rows. INSERT via service_role (triggers + edge functions).
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`.

**`notification_preferences` table**
- `user_id`, `event_type` (same enum strings as above), `in_app` (bool, default true), `email` (bool, default true). Unique `(user_id, event_type)`.
- RLS: user manages own rows.
- Missing row = both channels enabled (default).

**Triggers (SECURITY DEFINER)** that insert into `notifications`:
- `project_members` INSERT (status='invited' or 'active' with user_id) → `project_invite` for the new member.
- `tasks` INSERT or UPDATE where `assigned_to` changes → `task_assigned` for the assignee.
- `milestones` UPDATE on `status` change → notify PM(s) on `in_review`, assignee on `complete`/`rejected`.
- `evidence` INSERT → notify PM(s) (`evidence_submitted`).
- `payment_certificates` INSERT/UPDATE → notify client (`payment_authorized`) and PM (`payment_released`).

Triggers check `notification_preferences.in_app` (defaulting true) before inserting.

### 2. Email gating

Update existing `send-transactional-email` invocations (or the edge function itself) to check `notification_preferences.email` for the recipient + matching event type. Easiest: add a small check in `sendTransactionalEmail` helper that queries the prefs table by recipient email + event type and short-circuits when disabled. Map template names → event types in one small constant.

### 3. UI

**`src/hooks/useNotifications.ts`** — React Query hooks: `useNotifications()` (list, sorted desc), `useUnreadCount()`, `useMarkRead(id)`, `useMarkAllRead()`. Realtime subscription on `notifications` filtered by `user_id=eq.<me>` invalidates queries and fires a sonner toast for new ones.

**Bell icon** in the existing top-right area (next to `ProjectPill` / `BurgerMenu`). Shows unread count badge. Click opens a `Sheet` with the latest 10 notifications and a "View all" link to `/inbox`.

**`/inbox` route** (new page, added to bottom nav with badge). Full list grouped by today / earlier. Each row: icon by type, title, body, relative time, unread dot. Click → navigates to `link` and marks read. "Mark all read" action.

**Settings → Notifications** (new `/settings/notifications` page, linked from `BurgerMenu`). Table of event types × (in-app toggle, email toggle). Upserts `notification_preferences` rows.

### 4. Out of scope
- Push/web-push notifications.
- Per-project notification preferences (global only for v1).
- Digest emails.
- Notifying about own actions (triggers skip when actor == recipient).

### Files
- `supabase/migrations/<ts>_notifications.sql` (new)
- `src/hooks/useNotifications.ts` (new)
- `src/components/NotificationBell.tsx` (new)
- `src/pages/Inbox.tsx` (exists — repurpose as the inbox page route, add to nav)
- `src/pages/NotificationSettings.tsx` (new)
- `src/components/BottomNav.tsx`, `src/components/BurgerMenu.tsx`, `src/App.tsx` — wire new route + bell + nav entry
- `src/lib/sendEmail.ts` — add preference check
