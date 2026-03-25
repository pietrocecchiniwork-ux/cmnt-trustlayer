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
          work_type: "unknown",
          trade_category: "general",
          location_in_building: "ground_floor",
          completion_stage: "mid",
          condition_flag: "good",
          building_element: "walls",
          ai_summary: "AI not configured — default tags applied.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build rich context block
    const contextLines: string[] = [];
    if (project_name) contextLines.push(`Project: "${project_name}"`);
    if (milestone_name) contextLines.push(`Milestone: "${milestone_name}"`);
    if (milestone_description) contextLines.push(`Milestone description: "${milestone_description}"`);
    if (task_name) contextLines.push(`Task: "${task_name}"`);
    if (task_description) contextLines.push(`Task description: "${task_description}"`);
    if (all_tasks && Array.isArray(all_tasks) && all_tasks.length > 0) {
      const taskList = all_tasks.map((t: { name: string; status: string }) => `  - ${t.name} (${t.status})`).join("\n");
      contextLines.push(`Other tasks in this milestone:\n${taskList}`);
    }
    const contextBlock = contextLines.length
      ? `\n\nFull context for this evidence submission:\n${contextLines.join("\n")}\n\nUse this context to make your analysis more accurate. Specifically check whether the photo actually shows the work described in the task/milestone, and note any discrepancies.`
      : "";

    const prompt = `You are an expert UK construction site inspector analysing a photo submitted as evidence for a construction milestone.${contextBlock}

Analyse this construction photo carefully. Return a JSON object with exactly these fields:
- work_type: one of [demolition, excavation, concrete_pour, framing, rough_in, boarding, plastering, first_fix, second_fix, finishing, inspection, cleaning, landscaping]
- trade_category: one of [general, plumbing, electrical, carpentry, plastering, painting, tiling, roofing, glazing, bricklaying, flooring]
- location_in_building: one of [exterior, ground_floor, first_floor, second_floor, loft, basement, kitchen, bathroom, hallway, roof, garden, utility_room]
- completion_stage: one of [not_started, early, mid, first_fix, second_fix, finishing, complete, snagging]
- condition_flag: one of [good, acceptable, concern, defect]
- building_element: one of [foundations, walls, floor, ceiling, roof, pipework, wiring, joists, plasterwork, fixtures, windows, doors, insulation]
- quality_score: integer 1-10 rating how well this photo matches the milestone/task context (10 = perfect evidence showing exactly the expected work complete, 1 = completely unrelated or unusable photo). Consider: does the photo clearly show the work described? Is it well-lit and in focus? Does the completion stage match what the task expects?
- ai_summary: a 2-3 sentence description: (1) what you see in the photo, (2) whether it matches the expected milestone/task work, (3) any concerns or recommendations
- context_match: one of [exact_match, related, partial, unrelated] — how well the photo content matches the task/milestone description

Return ONLY the JSON object, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
              { type: "text", text: prompt },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Gateway ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const tags = JSON.parse(cleaned);

    return new Response(JSON.stringify(tags), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("tag-evidence error:", error);
    return new Response(
      JSON.stringify({
        work_type: "unknown",
        trade_category: "general",
        location_in_building: "ground_floor",
        completion_stage: "mid",
        condition_flag: "good",
        building_element: "walls",
        ai_summary: "Analysis failed — default tags applied.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
