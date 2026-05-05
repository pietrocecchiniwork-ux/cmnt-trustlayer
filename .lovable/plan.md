# WhatsApp Evidence Ingestion

Replace the in-app `WhatsAppSim` mock with a real two-way WhatsApp pipeline: contractors text/photo a Twilio WhatsApp number, Claude (the same model already used in `tag-evidence`) interprets the message in the context of their project, and the bot writes evidence/updates back to the DB and replies in the same chat.

## Architecture

```text
WhatsApp user
   │  text / image
   ▼
Twilio WhatsApp number
   │  webhook (POST form-encoded)
   ▼
Edge fn: whatsapp-webhook        ── verifies Twilio signature
   │                                 ── identifies user via phone_number
   │                                 ── loads active project + milestones/tasks
   │                                 ── downloads media from Twilio (basic auth)
   │                                 ── upload to evidence-photos bucket
   │                                 ── call Claude (vision) for tagging + intent
   │                                 ── insert evidence / update milestone
   │                                 ── update whatsapp_sessions state
   ▼
Edge fn: whatsapp-send (helper)  ── POSTs reply via Twilio gateway
```

## Phone-number → user link

Schema already has `project_members.phone_number` and a `whatsapp_sessions` table. Two small additions:

1. New table `whatsapp_identities` (one row per verified WhatsApp number → user_id) so a single number can map across projects, with a 6-digit OTP verification flow triggered from the Team screen.
2. Add `last_milestone_id` and `last_evidence_id` columns to `whatsapp_sessions` so follow-up messages ("add a note: leak fixed") attach to the right record.

Verification flow:
- User opens Team → "Connect WhatsApp", enters their number.
- App calls `whatsapp-verify-start` edge fn → sends a 6-digit code via Twilio.
- User replies in WhatsApp with the code → `whatsapp-webhook` matches it → row inserted in `whatsapp_identities`.

## Inbound message handling (`whatsapp-webhook`)

1. Validate `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN` (reject if missing/invalid).
2. Parse `From` (`whatsapp:+E164`), `Body`, `NumMedia`, `MediaUrl0..N`, `MediaContentType0..N`.
3. Look up `whatsapp_identities` → `user_id`. If unknown, treat as OTP candidate or send onboarding reply.
4. Resolve project: most recent active project for this user, or whichever project the session is currently focused on. If user belongs to >1 project and no session, reply with a numbered list ("reply 1 for Kensington Mews, 2 for …").
5. For each media item, fetch the binary with HTTP Basic auth (`TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN`), upload to `evidence-photos` bucket under `whatsapp/{user_id}/{uuid}.jpg`, capture the storage path.
6. Call Claude with one combined prompt (reuse the `tag-evidence` system prompt + an `intent` field). Inputs: image(s) base64, message text, project context (milestones list, current session focus). Output JSON:
   ```json
   {
     "intent": "submit_evidence" | "status_update" | "question" | "milestone_select" | "noop",
     "milestone_id": "uuid|null",
     "task_id": "uuid|null",
     "tags": { ...same shape as tag-evidence... },
     "note": "string",
     "reply": "human-friendly WhatsApp reply"
   }
   ```
7. Branch on `intent`:
   - `submit_evidence` → insert into `evidence` (channel = `whatsapp`, photo_url, ai_tags, note, submitted_by = user_id, gps fields null), insert `project_changes` row, update milestone status using existing state machine rules.
   - `status_update` → update milestone/task; insert `project_changes`.
   - `question` → read-only; Claude generates the reply from project context.
   - `milestone_select` → store choice in `whatsapp_sessions.milestone_id`.
8. Send `reply` back via Twilio (`Messages.json`, `From` = our WhatsApp sender, `To` = `From`).
9. Always return `200` with empty TwiML so Twilio doesn't retry on partial failures (errors get logged + a friendly reply is sent).

## Outbound helper (`whatsapp-send`)

Thin wrapper used by both the webhook and other backend events (e.g. milestone approved → notify contractor). Uses the Twilio connector via the gateway pattern documented for `connector_id: twilio` so we never hard-code credentials.

## Frontend changes

- Replace `WhatsAppSim.tsx` route with a real "WhatsApp" panel: shows linked number, QR/deeplink to `https://wa.me/<our-number>?text=hi`, recent inbound messages (read-only log from `project_changes` filtered by `channel=whatsapp`), and a "Disconnect" button.
- Team screen: add "Connect WhatsApp" button calling the verification edge fn.

## Setup the user must do

1. Approve the Twilio connector when prompted (built-in connector, no manual secrets).
2. In Twilio console: enable a WhatsApp sender (Sandbox is fine for dev, approved sender for prod), enable **SMS Pumping Protection** + **Geo Permissions** on the messaging service.
3. Set the WhatsApp inbound webhook to the deployed URL of `whatsapp-webhook` (we'll surface it after deploy).

## Out of scope for this iteration

- Voice notes (transcription) — can be added later by routing media with `audio/*` MIME to a transcription model.
- Multi-language replies — Claude handles it automatically; no extra plumbing needed.
- WhatsApp Business templates for proactive notifications outside the 24h window — flagged as a follow-up.
