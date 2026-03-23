import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!apiKey) {
      // Return default tags if no API key
      return new Response(
        JSON.stringify({
          work_type: "rough-in",
          trade_category: "plumbing",
          location_in_building: "kitchen",
          completion_stage: "first_fix",
          condition_flag: "good",
          building_element: "pipework",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: image_base64 },
              },
              {
                type: "text",
                text: `Analyze this construction photo. Return a JSON object with exactly these fields:
- work_type: one of [demolition, excavation, concrete_pour, framing, rough_in, boarding, plastering, first_fix, second_fix, finishing, inspection]
- trade_category: one of [general, plumbing, electrical, carpentry, plastering, painting, tiling, roofing, glazing]
- location_in_building: one of [exterior, ground_floor, first_floor, second_floor, loft, basement, kitchen, bathroom, hallway, roof]
- completion_stage: one of [not_started, early, mid, first_fix, second_fix, finishing, complete]
- condition_flag: one of [good, acceptable, concern, defect]
- building_element: one of [foundations, walls, floor, ceiling, roof, pipework, wiring, joists, plasterwork, fixtures]

Return ONLY the JSON object, no other text.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";
    const tags = JSON.parse(content);

    return new Response(JSON.stringify(tags), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        work_type: "unknown",
        trade_category: "general",
        location_in_building: "ground_floor",
        completion_stage: "mid",
        condition_flag: "good",
        building_element: "walls",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
