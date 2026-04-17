import { supabase } from "@/integrations/supabase/client";

export type EmailTemplate =
  | "evidence-submitted"
  | "milestone-approved"
  | "payment-authorized";

export async function sendTransactionalEmail(opts: {
  templateName: EmailTemplate;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}) {
  const { templateName, recipientEmail, idempotencyKey, templateData } = opts;
  if (!recipientEmail || !recipientEmail.includes("@")) return;
  try {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
    if (error) console.warn(`[email:${templateName}] send failed:`, error);
  } catch (err) {
    console.warn(`[email:${templateName}] threw:`, err);
  }
}
