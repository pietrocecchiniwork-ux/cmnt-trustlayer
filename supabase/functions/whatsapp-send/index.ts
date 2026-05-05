import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export async function sendWhatsApp(to: string, body: string, mediaUrl?: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const FROM = Deno.env.get("TWILIO_WHATSAPP_FROM"); // e.g. whatsapp:+14155238886
  if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY not configured" };
  if (!TWILIO_API_KEY) return { ok: false, error: "TWILIO_API_KEY not configured" };
  if (!FROM) return { ok: false, error: "TWILIO_WHATSAPP_FROM not configured" };

  const params = new URLSearchParams({
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    From: FROM,
    Body: body,
  });
  if (mediaUrl) params.append("MediaUrl", mediaUrl);

  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Twilio send error", res.status, data);
    return { ok: false, error: `Twilio ${res.status}: ${JSON.stringify(data)}` };
  }
  return { ok: true, sid: data.sid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { to, body, mediaUrl } = await req.json();
    if (!to || !body) {
      return new Response(JSON.stringify({ error: "to and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await sendWhatsApp(to, body, mediaUrl);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
