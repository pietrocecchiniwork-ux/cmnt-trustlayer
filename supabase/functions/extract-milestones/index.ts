import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { COMPACT_TAXONOMY_PROMPT } from "../_shared/ontology-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPT =
  `You are analysing a UK construction document. Return ONLY valid JSON in this exact shape:\n{"project_type": "new_build"|"extension"|"loft"|"refurb"|"fit_out"|"commercial_fit_out"|null, "milestones": [ { "name": string (max 60), "due_date": ISO date or null, "payment_value": number or null, "trade": string or null, "description": one-sentence string, "phase_id": canonical Cemento phase ID (e.g. "PH-005") or null } ]}\n\nMap each milestone to the closest canonical phase from the ontology below. If unsure, set phase_id to null. Infer project_type from the document. No explanation. No markdown.\n\n${COMPACT_TAXONOMY_PROMPT}`;

const IMAGE_TYPES = ["jpg", "jpeg", "png"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
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

  const ext = file_type.toLowerCase();
  const isImage = IMAGE_TYPES.includes(ext);
  const isPdf = ext === "pdf";

  if (ext === "docx" || ext === "doc") {
    return new Response(
      JSON.stringify({
        error:
          "DOCX/DOC contracts are not supported. Please export the document as a digital PDF and re-upload.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isImage && !isPdf) {
    return new Response(
      JSON.stringify({ error: `Unsupported file type: ${ext}. Upload a PDF or image.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let userContent: unknown[];

  if (isPdf) {
    userContent = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: file_base64 },
      },
      { type: "text", text: PROMPT },
    ];
  } else {
    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const mediaType = mediaTypeMap[ext] ?? "image/jpeg";
    userContent = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: file_base64 },
      },
      { type: "text", text: PROMPT },
    ];
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    console.error("Anthropic error:", anthropicRes.status, err);

    if (anthropicRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "AI error", detail: err }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await anthropicRes.json();
  const rawText: string =
    data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

  let milestones: unknown[] = [];
  let projectType: string | null = null;
  let parseOk = false;
  try {
    const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    parseOk = true;
    if (Array.isArray(parsed)) {
      milestones = parsed;
    } else if (parsed && typeof parsed === "object") {
      milestones = Array.isArray(parsed.milestones) ? parsed.milestones : [];
      projectType = typeof parsed.project_type === "string" ? parsed.project_type : null;
    }
  } catch (e) {
    console.error("Failed to parse AI response:", rawText, e);
  }

  if (!parseOk || milestones.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          "We couldn't extract any milestones from this document. If it's a scanned PDF, please upload a digital (text-based) PDF instead.",
        project_type: projectType,
        milestones: [],
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ project_type: projectType, milestones }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
