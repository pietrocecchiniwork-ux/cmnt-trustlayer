
## Project AI Assistant

A floating "Ask AI" button available on every project screen. Users (PM, Contractor, Client) can open a chat panel to ask anything about the current project — get a daily recap, understand what a task means, or see what's blocked. Read-only: the assistant never modifies data. Sessions are ephemeral (cleared when the panel closes or the project is left).

### User experience

- **Floating button**: round, bottom-right of every project route, AI sparkle-free icon (chat bubble + small mark consistent with the cream/white design system).
- **Slide-over panel**: opens from the right (desktop) / bottom sheet (mobile). Contains:
  - Header: "Project assistant" + project name + close button.
  - Suggested prompts as chips (role-aware): "What happened today?", "What's blocked?", "Explain my next task", "What did <member> do this week?".
  - Message transcript using AI Elements (`Conversation`, `Message`, `MessageResponse`, `Shimmer`, `PromptInput`).
  - Composer pinned to bottom, auto-focused.
- **Ephemeral**: closing the panel or navigating to a different project clears the transcript. No DB persistence.
- **Role-aware scope**: the assistant only sees data the current user is allowed to see (PM = full project; Contractor = own milestones/tasks; Client = high-level + payments).

### Capabilities (v1)

All read-only. The model is given a compact project context bundle plus a small set of server-side tools:

1. **Daily activity recap** — summarises evidence submitted, tasks completed, milestones moved, payments released for a given day (default: today).
2. **Explain a task / milestone** — plain-English description, expected evidence, concealment flag, who's assigned, current state.
3. **Surface blockers & overdue items** — overdue milestones, stuck evidence (awaiting QA), unverified team members, payment certificates pending action.
4. **General project Q&A** — progress %, who's on the team, contract value, next upcoming milestones.

Out of scope for v1: creating/editing tasks, sending messages to members, payment actions (kept consistent with the "no task management / no messaging" project constraints — assistant only *reports* on these).

### Technical design

**Frontend**
- New component `src/components/ProjectAssistant/AssistantFab.tsx` — floating button, mounted inside `ProjectLayout` so it appears on every `/project/*` route.
- `AssistantPanel.tsx` — slide-over (`Sheet` from shadcn) hosting the chat.
- `AssistantChat.tsx` — uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointed at the new edge function. Messages held in component state only; unmount on close = ephemeral.
- AI Elements installed: `conversation`, `message`, `prompt-input`, `shimmer`, `tool`.
- Suggested-prompt chips call `sendMessage({ text })`.

**Backend — new edge function `project-assistant`**
- Input: `{ projectId, messages: UIMessage[] }`.
- Auth: validates JWT, then verifies the user is a member of `projectId` via `project_members`; derives role.
- Builds a **scoped context bundle** (server-side, role-filtered):
  - Project meta (name, contract type, dates, value, progress).
  - Recent activity from `project_changes` (last 7 days, filtered by role visibility — reuses existing role-filtered audit logic).
  - Milestones with state, due dates, assignee (Contractor sees only own).
  - Tasks for current user (Contractor) or all (PM/Client high-level).
  - Open blockers: overdue milestones, evidence in `pending_qa`, payment certificates awaiting action.
- Calls Lovable AI Gateway via the AI SDK with `google/gemini-3-flash-preview`, streams response via `toUIMessageStreamResponse`.
- System prompt includes the LCM ontology (reuses `mem://features/app-knowledge-ontology` pattern already injected elsewhere) + the role + the scoped bundle as a structured JSON block + strict instructions ("read-only, never invent data, cite milestone/task names when referring to them, answer in the user's language").
- Optional AI SDK tool `get_day_activity({ date })` so the model can request a specific day's recap without bloating the initial context.

**Security**
- No new tables, no RLS changes. The edge function is the only new surface; it enforces project membership and role before assembling context.
- `LOVABLE_API_KEY` stays server-side.

### Files to add/change

```text
supabase/functions/project-assistant/index.ts        (new)
supabase/functions/_shared/ai-gateway.ts             (new or reuse if exists)
src/components/ProjectAssistant/AssistantFab.tsx     (new)
src/components/ProjectAssistant/AssistantPanel.tsx   (new)
src/components/ProjectAssistant/AssistantChat.tsx    (new)
src/components/ProjectAssistant/SuggestedPrompts.tsx (new)
src/components/ai-elements/*                         (installed via ai-elements CLI)
src/layouts/ProjectLayout.tsx (or equivalent)        (mount <AssistantFab />)
```

No database migrations. No changes to existing screens beyond mounting the FAB in the project layout.

### Out of scope (explicit)
- Persisting chat history (ephemeral per session by user choice).
- Letting the assistant write/modify data (read-only by user choice).
- Voice input, file uploads into the chat, multi-project chat.

