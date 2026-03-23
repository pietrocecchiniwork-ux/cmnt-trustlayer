import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Create project
    const { data: project, error: pErr } = await admin
      .from("projects")
      .insert({
        name: "14 Kensington Mews — Residential Refurbishment",
        address: "14 Kensington Mews, London W8 4PT",
        start_date: "2026-01-10",
        end_date: "2026-05-25",
        payment_mode: true,
        total_budget: 92000,
        created_by: user.id,
      })
      .select()
      .single();
    if (pErr) throw pErr;

    const pid = project.id;

    // 2. Milestones
    const milestones = [
      { name: "site setup and demolition", due_date: "2026-01-10", payment_value: 8000, status: "complete", position: 1 },
      { name: "foundations and groundwork", due_date: "2026-01-28", payment_value: 15000, status: "complete", position: 2 },
      { name: "structural frame and roof", due_date: "2026-02-20", payment_value: 22000, status: "complete", position: 3 },
      { name: "first fix electrical and plumbing", due_date: "2026-03-08", payment_value: 11000, status: "overdue", position: 4 },
      { name: "plastering and drylining", due_date: "2026-03-22", payment_value: 9000, status: "in_progress", position: 5 },
      { name: "second fix and joinery", due_date: "2026-04-10", payment_value: 14000, status: "pending", position: 6 },
      { name: "decoration and finishing", due_date: "2026-04-28", payment_value: 7000, status: "pending", position: 7 },
      { name: "final inspection and handover", due_date: "2026-05-12", payment_value: 6000, status: "pending", position: 8 },
    ];
    const { data: mData, error: mErr } = await admin
      .from("milestones")
      .insert(milestones.map((m) => ({ ...m, project_id: pid })))
      .select();
    if (mErr) throw mErr;

    // 3. Team members
    const members = [
      { name: "anna p.", role: "pm", user_id: user.id, status: "active", joined_at: new Date().toISOString() },
      { name: "mark t.", role: "contractor", status: "active", joined_at: new Date().toISOString() },
      { name: "sarah k.", role: "trade", status: "active", joined_at: new Date().toISOString() },
      { name: "james r.", role: "client", status: "active", joined_at: new Date().toISOString() },
    ];
    const { error: tmErr } = await admin
      .from("project_members")
      .insert(members.map((m) => ({ ...m, project_id: pid })));
    if (tmErr) throw tmErr;

    // 4. Evidence against milestone 4
    const m4 = mData.find((m: any) => m.position === 4);
    if (m4) {
      const evidenceItems = [
        {
          milestone_id: m4.id,
          submitted_by: user.id,
          channel: "app",
          note: "First fix plumbing rough-in complete in kitchen",
          ai_tags: { work_type: "plumbing", trade_category: "plumber", location_in_building: "kitchen", completion_stage: "rough-in", condition_flag: "good", building_element: "pipework" },
        },
        {
          milestone_id: m4.id,
          submitted_by: user.id,
          channel: "app",
          note: "Electrical wiring run through ground floor",
          ai_tags: { work_type: "electrical", trade_category: "electrician", location_in_building: "ground floor", completion_stage: "rough-in", condition_flag: "good", building_element: "wiring" },
        },
        {
          milestone_id: m4.id,
          submitted_by: user.id,
          channel: "app",
          note: "Hot and cold water supply installed in bathroom",
          ai_tags: { work_type: "plumbing", trade_category: "plumber", location_in_building: "bathroom", completion_stage: "rough-in", condition_flag: "good", building_element: "pipework" },
        },
        {
          milestone_id: m4.id,
          submitted_by: user.id,
          channel: "whatsapp",
          note: "Consumer unit fitted in utility cupboard",
          ai_tags: { work_type: "electrical", trade_category: "electrician", location_in_building: "utility", completion_stage: "first fix", condition_flag: "attention", building_element: "consumer unit" },
        },
      ];
      const { error: eErr } = await admin.from("evidence").insert(evidenceItems);
      if (eErr) throw eErr;
    }

    // 5. Payment certificates for milestones 1, 2, 3
    const completeMilestones = mData.filter((m: any) => [1, 2, 3].includes(m.position));
    if (completeMilestones.length) {
      const certs = completeMilestones.map((m: any) => ({
        milestone_id: m.id,
        amount: m.payment_value,
        released_at: new Date().toISOString(),
        released_by: user.id,
      }));
      const { error: cErr } = await admin.from("payment_certificates").insert(certs);
      if (cErr) throw cErr;
    }

    return new Response(JSON.stringify({ project_id: pid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("seed-demo-project error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
