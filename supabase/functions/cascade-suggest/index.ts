import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { overdue_milestone, days_overdue, all_milestones } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      // Fallback: simple cascade — shift all future milestones by days_overdue
      const overdueDueDate = new Date(overdue_milestone.due_date);
      const suggestions = all_milestones
        .filter((m: any) => new Date(m.due_date) > overdueDueDate && m.status !== "complete")
        .map((m: any) => {
          const oldDate = new Date(m.due_date);
          const newDate = new Date(oldDate);
          newDate.setDate(newDate.getDate() + days_overdue);
          return {
            milestone_id: m.id,
            old_date: m.due_date,
            suggested_date: newDate.toISOString().split("T")[0],
            reason: `Shifted ${days_overdue} days due to delay in ${overdue_milestone.name}`,
          };
        });

      return new Response(JSON.stringify(suggestions), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `A construction milestone "${overdue_milestone.name}" is ${days_overdue} days overdue (was due ${overdue_milestone.due_date}).

Here are all project milestones:
${JSON.stringify(all_milestones, null, 2)}

Suggest new dates for all affected downstream milestones. Consider trade dependencies and realistic scheduling.

Return a JSON array of objects with: milestone_id, old_date, suggested_date, reason.
Return ONLY the JSON array.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";
    const suggestions = JSON.parse(content);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
