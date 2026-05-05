import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Public webhook called by Twilio. No JWT verification.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response/>`;

function twiml(reply?: string) {
  const xml = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`
    : TWIML_OK;
  return new Response(xml, { status: 200, headers: { "Content-Type": "text/xml" } });
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

async function sendReply(to: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
    console.error("Twilio config missing for sendReply");
    return;
  }
  const params = new URLSearchParams({ To: to, From: FROM, Body: body });
  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) console.error("Twilio reply failed", res.status, await res.text());
}

async function fetchTwilioMedia(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  // Twilio media URLs require account auth. Use the connector gateway proxy by extracting the path.
  // Easiest: re-call Twilio directly using the API key isn't possible (gateway only). So we proxy via the gateway.
  // The media URL path looks like: /2010-04-01/Accounts/{SID}/Messages/{MID}/Media/{MEDIA_SID}
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY")!;
  const m = url.match(/\/2010-04-01\/Accounts\/[^/]+(\/Messages\/[^/]+\/Media\/[^/?]+)/);
  if (!m) {
    console.error("Could not parse twilio media url", url);
    return null;
  }
  const gwPath = m[1]; // gateway prepends /2010-04-01/Accounts/{SID}
  const res = await fetch(`${GATEWAY_URL}${gwPath}`, {
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY },
    redirect: "follow",
  });
  if (!res.ok) {
    console.error("Media fetch failed", res.status, await res.text());
    return null;
  }
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, contentType };
}

async function callClaude(opts: {
  text: string;
  imagesB64: { data: string; mediaType: string }[];
  projectName: string;
  milestones: { id: string; name: string; status: string; description?: string | null }[];
  focusedMilestoneId?: string | null;
}): Promise<{
  intent: string;
  milestone_id: string | null;
  task_id: string | null;
  tags: Record<string, unknown>;
  note: string;
  reply: string;
}> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const milestonesText = opts.milestones
    .map((m) => `- ${m.id} | ${m.name} (${m.status})${m.description ? ` — ${m.description}` : ""}`)
    .join("\n");

  const system = `You are the Cemento WhatsApp bot. You receive messages from a contractor about a construction project and decide what to do.

Project: "${opts.projectName}"
Milestones (id | name (status) — description):
${milestonesText}
${opts.focusedMilestoneId ? `Currently focused milestone_id: ${opts.focusedMilestoneId}` : ""}

Always respond with strict JSON matching this shape:
{
  "intent": "submit_evidence" | "status_update" | "question" | "milestone_select" | "noop",
  "milestone_id": string | null,
  "task_id": null,
  "tags": { "work_type": string, "trade_category": string, "location_in_building": string, "completion_stage": string, "condition_flag": string, "building_element": string },
  "note": string,
  "reply": string
}

Rules:
- If the user sent an image, intent is usually "submit_evidence". Pick the best-matching milestone_id.
- If the user just asks something (e.g. "what's left to do?"), intent is "question" and reply summarises from the project context.
- If the user explicitly chooses a milestone, intent is "milestone_select".
- "reply" is what we will send back over WhatsApp — keep it short, friendly, plain text.
- Never invent milestone ids. Use null if unsure.`;

  const content: unknown[] = [];
  for (const img of opts.imagesB64) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }
  content.push({ type: "text", text: opts.text || "(no text)" });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned no JSON");
  return JSON.parse(jsonMatch[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return twiml();

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const form = await req.formData();
    const from = String(form.get("From") ?? ""); // whatsapp:+E164
    const body = String(form.get("Body") ?? "").trim();
    const numMedia = parseInt(String(form.get("NumMedia") ?? "0"), 10);
    const phone = from.replace(/^whatsapp:/, "");

    if (!from) return twiml();

    // 1. OTP path: any 6-digit body and there's a pending verification for this phone.
    if (/^\d{6}$/.test(body)) {
      const { data: ver } = await admin
        .from("whatsapp_verifications")
        .select("*")
        .eq("phone_number", phone)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ver && ver.code === body) {
        await admin.from("whatsapp_verifications").update({ consumed_at: new Date().toISOString() }).eq("id", ver.id);
        await admin.from("whatsapp_identities").upsert({ user_id: ver.user_id, phone_number: phone }, { onConflict: "phone_number" });
        await sendReply(from, "✅ WhatsApp linked. Send a photo of work to log evidence, or ask me about your project.");
        return twiml();
      }
    }

    // 2. Identify user
    const { data: identity } = await admin
      .from("whatsapp_identities")
      .select("user_id")
      .eq("phone_number", phone)
      .maybeSingle();
    if (!identity) {
      await sendReply(from, "This number isn't linked to a Cemento account. Open the app → Team → Connect WhatsApp to link it.");
      return twiml();
    }
    const userId = identity.user_id as string;

    // 3. Resolve project (most recent active membership)
    const { data: memberships } = await admin
      .from("project_members")
      .select("project_id, projects:project_id(id, name, cancelled_at)")
      .eq("user_id", userId)
      .eq("status", "active");
    const activeProjects = (memberships ?? [])
      .map((m: { projects: { id: string; name: string; cancelled_at: string | null } | null }) => m.projects)
      .filter((p): p is { id: string; name: string; cancelled_at: string | null } => !!p && !p.cancelled_at);

    if (activeProjects.length === 0) {
      await sendReply(from, "No active project found for your account.");
      return twiml();
    }

    // session
    const { data: session } = await admin
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();

    let project = activeProjects[0];
    if (session?.project_id) {
      const found = activeProjects.find((p) => p.id === session.project_id);
      if (found) project = found;
    }

    // If multiple projects and message looks like a number, treat as project selection
    if (activeProjects.length > 1 && /^\d{1,2}$/.test(body) && !session?.project_id) {
      const idx = parseInt(body, 10) - 1;
      if (activeProjects[idx]) {
        project = activeProjects[idx];
        await admin.from("whatsapp_sessions").upsert({
          phone_number: phone, user_id: userId, project_id: project.id, state: "active", last_inbound_at: new Date().toISOString(),
        }, { onConflict: "phone_number" });
        await sendReply(from, `📂 Working on "${project.name}". Send a photo or question.`);
        return twiml();
      }
    }
    if (activeProjects.length > 1 && !session?.project_id && numMedia === 0 && !body) {
      const list = activeProjects.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
      await sendReply(from, `Which project?\n${list}\n\nReply with the number.`);
      return twiml();
    }

    // 4. Load milestones
    const { data: milestones } = await admin
      .from("milestones")
      .select("id, name, status, description, payment_value")
      .eq("project_id", project.id)
      .order("position");

    // 5. Download media
    const imagesB64: { data: string; mediaType: string }[] = [];
    const photoUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = String(form.get(`MediaUrl${i}`) ?? "");
      const ct = String(form.get(`MediaContentType${i}`) ?? "");
      if (!url || !ct.startsWith("image/")) continue;
      const media = await fetchTwilioMedia(url);
      if (!media) continue;
      const ext = ct.split("/")[1]?.split(";")[0] ?? "jpg";
      const path = `whatsapp/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await admin.storage.from("evidence-photos").upload(path, media.bytes, { contentType: ct, upsert: false });
      if (upErr) {
        console.error("storage upload failed", upErr);
        continue;
      }
      const { data: pub } = admin.storage.from("evidence-photos").getPublicUrl(path);
      photoUrls.push(pub.publicUrl);
      // Base64 for Claude
      let bin = "";
      const chunk = 0x8000;
      for (let j = 0; j < media.bytes.length; j += chunk) {
        bin += String.fromCharCode(...media.bytes.subarray(j, j + chunk));
      }
      imagesB64.push({ data: btoa(bin), mediaType: ct.split(";")[0] });
    }

    // 6. Call Claude
    let aiResult;
    try {
      aiResult = await callClaude({
        text: body,
        imagesB64,
        projectName: project.name,
        milestones: (milestones ?? []) as { id: string; name: string; status: string; description?: string | null }[],
        focusedMilestoneId: session?.last_milestone_id ?? null,
      });
    } catch (e) {
      console.error("Claude failed", e);
      await sendReply(from, "Sorry, I couldn't process that just now. Try again in a moment.");
      return twiml();
    }

    // 7. Branch on intent
    const userName = (await admin.from("project_members").select("name").eq("user_id", userId).eq("project_id", project.id).maybeSingle()).data?.name ?? "WhatsApp user";

    if (aiResult.intent === "submit_evidence" && aiResult.milestone_id && photoUrls.length > 0) {
      const { data: ev, error: evErr } = await admin.from("evidence").insert({
        milestone_id: aiResult.milestone_id,
        submitted_by: userId,
        channel: "whatsapp",
        photo_url: photoUrls[0],
        ai_tags: aiResult.tags,
        note: aiResult.note || body || null,
      }).select("id").single();
      if (evErr) console.error("evidence insert failed", evErr);

      // bump milestone to in_review if pending/in_progress
      const ms = milestones?.find((m) => m.id === aiResult.milestone_id);
      if (ms && (ms.status === "pending" || ms.status === "in_progress")) {
        await admin.from("milestones").update({ status: "in_review" }).eq("id", aiResult.milestone_id);
      }

      await admin.from("project_changes").insert({
        project_id: project.id,
        entity_type: "evidence",
        entity_id: ev?.id ?? null,
        entity_name: ms?.name ?? "Evidence",
        change_type: "submitted_via_whatsapp",
        changed_by: userId,
        changed_by_name: userName,
        new_value: { photo_url: photoUrls[0], tags: aiResult.tags, note: aiResult.note },
      });

      await admin.from("whatsapp_sessions").upsert({
        phone_number: phone, user_id: userId, project_id: project.id,
        last_milestone_id: aiResult.milestone_id, last_evidence_id: ev?.id ?? null,
        state: "active", last_inbound_at: new Date().toISOString(),
      }, { onConflict: "phone_number" });
    } else if (aiResult.intent === "milestone_select" && aiResult.milestone_id) {
      await admin.from("whatsapp_sessions").upsert({
        phone_number: phone, user_id: userId, project_id: project.id,
        last_milestone_id: aiResult.milestone_id, state: "active", last_inbound_at: new Date().toISOString(),
      }, { onConflict: "phone_number" });
    } else {
      await admin.from("whatsapp_sessions").upsert({
        phone_number: phone, user_id: userId, project_id: project.id,
        state: "active", last_inbound_at: new Date().toISOString(),
      }, { onConflict: "phone_number" });
    }

    await sendReply(from, aiResult.reply || "Got it.");
    return twiml();
  } catch (e) {
    console.error("webhook error", e);
    return twiml();
  }
});
