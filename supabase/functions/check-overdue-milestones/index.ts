import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().split("T")[0];

  const { data: milestones, error: fetchError } = await supabase
    .from("milestones")
    .select("id, name, due_date, project_id")
    .in("status", ["pending", "in_progress"])
    .lt("due_date", today);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!milestones || milestones.length === 0) {
    return new Response(JSON.stringify({ updated: 0, milestone_ids: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const milestoneIds = milestones.map((m) => m.id);

  const { error: updateError } = await supabase
    .from("milestones")
    .update({ status: "overdue" })
    .in("id", milestoneIds);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const auditRows = milestones.map((m) => ({
    event_type: "milestone_overdue",
    project_id: m.project_id,
    metadata: { milestone_name: m.name, due_date: m.due_date },
  }));

  const { error: auditError } = await supabase
    .from("audit_log")
    .insert(auditRows);

  if (auditError) {
    console.error("audit_log insert failed:", auditError.message);
  }

  return new Response(
    JSON.stringify({ updated: milestones.length, milestone_ids: milestoneIds }),
    { headers: { "Content-Type": "application/json" } }
  );
});
