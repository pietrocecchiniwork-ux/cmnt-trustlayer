import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPT =
  "You are analysing a UK construction document. Extract every milestone, stage, or work package. Return ONLY a valid JSON array where each object has: name (string max 60 chars), due_date (ISO date or null), payment_value (number or null), trade (string or null), description (string one sentence). No explanation. No markdown.";

const IMAGE_TYPES = ["jpg", "jpeg", "png"];

function base64ToText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { file_base64?: string; file_type?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { file_base64, file_type } = body;
  if (!file_base64 || !file_type) {
    return new Response(JSON.stringify({ error: "file_base64 and file_type are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isImage = IMAGE_TYPES.includes(file_type.toLowerCase());

  let messages: unknown[];

  if (isImage) {
    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const mediaType = mediaTypeMap[file_type.toLowerCase()] ?? "image/jpeg";

    messages = [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${file_base64}` },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ];
  } else {
    const text = base64ToText(file_base64);
    messages = [
      {
        role: "user",
        content: `${PROMPT}\n\nDocument content:\n${text}`,
      },
    ];
  }

  const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
    }),
  });

  if (!gatewayRes.ok) {
    const err = await gatewayRes.text();
    console.error("AI gateway error:", gatewayRes.status, err);

    if (gatewayRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (gatewayRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "AI error", detail: err }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await gatewayRes.json();
  const rawText: string = data.choices?.[0]?.message?.content ?? "";

  let milestones: unknown[] = [];
  try {
    const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    milestones = JSON.parse(cleaned);
    if (!Array.isArray(milestones)) milestones = [];
  } catch (e) {
    console.error("Failed to parse AI response:", rawText, e);
    milestones = [];
  }

  return new Response(JSON.stringify(milestones), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
