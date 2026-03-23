import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_PROMPT =
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
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
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

  let claudeMessages: unknown[];

  if (isImage) {
    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const mediaType = mediaTypeMap[file_type.toLowerCase()] ?? "image/jpeg";

    claudeMessages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: file_base64,
            },
          },
          {
            type: "text",
            text: CLAUDE_PROMPT,
          },
        ],
      },
    ];
  } else {
    // pdf or docx — decode base64 to text
    const text = base64ToText(file_base64);
    claudeMessages = [
      {
        role: "user",
        content: `${CLAUDE_PROMPT}\n\nDocument content:\n${text}`,
      },
    ];
  }

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 2048,
      messages: claudeMessages,
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    console.error("Claude API error:", err);
    return new Response(JSON.stringify({ error: "Claude API error", detail: err }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const claudeData = await claudeRes.json();
  const rawText: string = claudeData?.content?.[0]?.text ?? "";

  let milestones: unknown[] = [];
  try {
    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    milestones = JSON.parse(cleaned);
    if (!Array.isArray(milestones)) milestones = [];
  } catch (e) {
    console.error("Failed to parse Claude response:", rawText, e);
    milestones = [];
  }

  return new Response(JSON.stringify(milestones), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
