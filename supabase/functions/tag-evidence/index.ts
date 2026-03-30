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
    const { image_base64, milestone_name, task_name, project_name, milestone_description, task_description, all_tasks } = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
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
    const extraContext = contextLines.length ? "\n" + contextLines.join("\n") : "";

    const prompt = `You are analysing a construction site photo for a UK construction verification platform.

Project context:
- Milestone: ${milestone_name || "unknown"}
- Task: ${task_name || "unknown"}${extraContext}

Analyse this photo and return ONLY a valid JSON object with exactly these fields and only these allowed values:

{
  "work_type": one of [electrical, plumbing, structural, roofing, insulation, plastering, carpentry, glazing, decoration, groundworks, drainage, hvac, other],
  "trade_category": one of [main_contractor, electrician, plumber, carpenter, plasterer, roofer, groundworker, glazier, decorator, structural_engineer, other],
  "location_in_building": one of [basement, ground_floor, first_floor, second_floor, roof, external, foundation, party_wall, loft, other],
  "completion_stage": one of [groundworks, shell, first_fix, insulation, plastering, second_fix, fit_out, snagging, complete],
  "condition_flag": one of [pass, concern, fail],
  "building_element": one of [wall, ceiling, floor, roof, window, door, staircase, foundation, frame, drainage, services, other],
  "milestone_match": boolean — does this photo appear to show work related to the milestone "${milestone_name || "unknown"}"?,
  "ai_comment": string — one sentence assessment of the work quality and whether it appears correctly completed
}

Return ONLY the JSON object. No explanation. No markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                  detail: "low",
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
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content ?? "{}";
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
