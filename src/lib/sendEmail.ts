import { supabase } from "@/integrations/supabase/client";

export type EmailTemplate =
  | "evidence-submitted"
  | "milestone-approved"
  | "payment-authorized";

// Map email templates to notification event_type for preference checks.
const TEMPLATE_TO_EVENT: Record<EmailTemplate, string> = {
  "evidence-submitted": "evidence_submitted",
  "milestone-approved": "milestone_approved",
  "payment-authorized": "payment_authorized",
};

async function emailEnabledFor(recipientEmail: string, eventType: string): Promise<boolean> {
  try {
    // Look up the user_id of the recipient via project_members (best-effort).
    const { data: member } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("email", recipientEmail.toLowerCase())
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (!member?.user_id) return true; // no account yet — send

    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("email")
      .eq("user_id", member.user_id)
      .eq("event_type", eventType)
      .maybeSingle();
    return pref?.email ?? true;
  } catch {
    return true; // fail open
  }
}

export async function sendTransactionalEmail(opts: {
  templateName: EmailTemplate;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}) {
  const { templateName, recipientEmail, idempotencyKey, templateData } = opts;
  if (!recipientEmail || !recipientEmail.includes("@")) return;

  const eventType = TEMPLATE_TO_EVENT[templateName];
  if (eventType) {
    const allowed = await emailEnabledFor(recipientEmail, eventType);
    if (!allowed) {
      console.log(`[email:${templateName}] skipped — recipient disabled email for ${eventType}`);
      return;
    }
  }

  try {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
    if (error) console.warn(`[email:${templateName}] send failed:`, error);
  } catch (err) {
    console.warn(`[email:${templateName}] threw:`, err);
  }
}
