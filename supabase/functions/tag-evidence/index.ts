import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, project_id, milestone_name, task_name, project_name, milestone_description, task_description, all_tasks } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({
          work_type: "other",
          trade_category: "other",
          location_in_building: "other",
          completion_stage: "first_fix",
          condition_flag: "concern",
          building_element: "other",
          milestone_match: false,
          ai_comment: "AI not configured — default tags applied.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build rich context
    const contextLines: string[] = [];
    if (project_name) contextLines.push(`- Project: "${project_name}"`);
    if (milestone_description) contextLines.push(`- Milestone description: "${milestone_description}"`);
    if (task_description) contextLines.push(`- Task description: "${task_description}"`);
    if (all_tasks && Array.isArray(all_tasks) && all_tasks.length > 0) {
      const taskList = all_tasks.map((t: { name: string; status: string }) => `  - ${t.name} (${t.status})`).join("\n");
      contextLines.push(`- Other tasks in this milestone:\n${taskList}`);
    }

    // Retrieve project knowledge (RAG)
    let knowledgeBlock = "";
    if (project_id) {
      try {
        const query = [project_name, milestone_name, task_name, milestone_description].filter(Boolean).join(" — ");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceKey && query) {
          const retRes = await fetch(`${supabaseUrl}/functions/v1/retrieve-knowledge`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ project_id, query, k: 5 }),
          });
          if (retRes.ok) {
            const { chunks } = await retRes.json();
            if (Array.isArray(chunks) && chunks.length > 0) {
              const formatted = chunks
                .map((c: { content: string }, i: number) => `[${i + 1}] ${c.content}`)
                .join("\n\n");
              knowledgeBlock = `\n\nProject knowledge (excerpts from uploaded reference documents — use to inform your assessment):\n${formatted}`;
            }
          }
        }
      } catch (e) {
        console.warn("Knowledge retrieval failed:", e);
      }
    }

    const extraContext = contextLines.length ? "\n" + contextLines.join("\n") : "";

    const prompt = `You are analysing a construction site photo for a UK construction verification platform.

Project context:
- Milestone: ${milestone_name || "unknown"}
- Task: ${task_name || "unknown"}${extraContext}

Analyse this photo and return ONLY a valid JSON object with exactly these six fields and only these allowed values:

{
  "work_type": one of [electrical, plumbing, structural, roofing, insulation, plastering, carpentry, glazing, decoration, groundworks, drainage, hvac, other],
  "trade_category": one of [main_contractor, electrician, plumber, carpenter, plasterer, roofer, groundworker, glazier, decorator, structural_engineer, other],
  "location_in_building": one of [basement, ground_floor, first_floor, second_floor, roof, external, foundation, party_wall, loft, other],
  "completion_stage": one of [groundworks, shell, first_fix, insulation, plastering, second_fix, fit_out, snagging, complete],
  "condition_flag": one of [pass, concern, fail],
  "building_element": one of [wall, ceiling, floor, roof, window, door, staircase, foundation, frame, drainage, services, other]
}

Also add two additional fields:
- "milestone_match": boolean — does this photo appear to show work related to the milestone "${milestone_name || "unknown"}"?
- "ai_comment": string — one sentence assessment of the work quality and whether it appears correctly completed

Return ONLY the JSON object. No explanation. No markdown.`;

    // Detect media type from base64 header bytes
    let mediaType = "image/jpeg";
    try {
      const raw = atob(image_base64.substring(0, 16));
      if (raw.charCodeAt(0) === 0x89 && raw.substring(1, 4) === "PNG") {
        mediaType = "image/png";
      } else if (raw.substring(0, 4) === "RIFF" && raw.substring(8, 12) === "WEBP") {
        mediaType = "image/webp";
      }
    } catch { /* default to jpeg */ }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Anthropic ${response.status}`);
    }

    const result = await response.json();
    const text = result.content?.[0]?.text ?? "{}";
    const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const tags = JSON.parse(cleaned);

    return new Response(JSON.stringify(tags), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("tag-evidence error:", error);
    return new Response(
      JSON.stringify({
        work_type: "other",
        trade_category: "other",
        location_in_building: "other",
        completion_stage: "first_fix",
        condition_flag: "concern",
        building_element: "other",
        milestone_match: false,
        ai_comment: "Analysis failed — default tags applied.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
