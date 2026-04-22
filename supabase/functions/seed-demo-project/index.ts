import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Curated public construction photos (Unsplash) — stable URLs
const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80",
  "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=1200&q=80",
  "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&q=80",
];

// London-area GPS jitter around 14 Kensington Mews (51.5008, -0.1900)
function jitterGps(): { lat: number; lng: number } {
  return {
    lat: 51.5008 + (Math.random() - 0.5) * 0.0008,
    lng: -0.1900 + (Math.random() - 0.5) * 0.0008,
  };
}

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
      { name: "site setup and demolition", due_date: "2026-01-10", payment_value: 8000, status: "complete", position: 1, checklist: ["site hoarding erected", "welfare facilities installed", "existing services located and marked", "asbestos survey completed", "skip and waste management in place"] },
      { name: "foundations and groundwork", due_date: "2026-01-28", payment_value: 15000, status: "complete", position: 2, checklist: ["trial holes dug", "foundation trenches excavated", "concrete poured and cured", "damp proof membrane laid", "building control inspection passed"] },
      { name: "structural frame and roof", due_date: "2026-02-20", payment_value: 22000, status: "complete", position: 3, checklist: ["steel beams installed and padstones set", "new openings formed and lintels installed", "structural engineer sign-off obtained", "roof structure formed", "roof tiles or covering fixed"] },
      { name: "first fix electrical and plumbing", due_date: "2026-03-08", payment_value: 11000, status: "overdue", position: 4, checklist: ["consumer unit position set", "cable routes run", "soil and waste pipes run", "hot and cold supply pipes run", "earth bonding completed"] },
      { name: "plastering and drylining", due_date: "2026-03-22", payment_value: 9000, status: "in_progress", position: 5, checklist: ["dot and dab or studwork drylining fixed", "coving grounds fixed", "wet plaster scratch coat applied", "finish coat applied", "reveals and beads finished"] },
      { name: "second fix and joinery", due_date: "2026-04-10", payment_value: 14000, status: "pending", position: 6, checklist: ["skirting and architrave fixed", "doors hung", "sockets and switches fitted", "light fittings installed", "sanitaryware fitted"] },
      { name: "decoration and finishing", due_date: "2026-04-28", payment_value: 7000, status: "pending", position: 7, checklist: ["mist coat applied", "full emulsion applied", "gloss to woodwork", "floor covering fitted", "thresholds and trims fixed"] },
      { name: "final inspection and handover", due_date: "2026-05-12", payment_value: 6000, status: "pending", position: 8, checklist: ["full snagging inspection completed", "all defects remedied", "building control completion certificate obtained", "O&M manuals provided", "keys and warranties handed over"] },
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

    // 4. Evidence — distribute across completed and in-progress milestones, with photos + GPS
    const evidenceTargets = mData.filter((m: any) => [2, 3, 4, 5].includes(m.position));
    const evidenceItems: any[] = [];
    const samples = [
      { note: "First fix plumbing rough-in complete in kitchen", tags: { work_type: "plumbing", trade_category: "plumber", location_in_building: "kitchen", completion_stage: "rough-in", condition_flag: "pass", building_element: "pipework", milestone_match: true } },
      { note: "Electrical wiring run through ground floor", tags: { work_type: "electrical", trade_category: "electrician", location_in_building: "ground floor", completion_stage: "rough-in", condition_flag: "pass", building_element: "wiring", milestone_match: true } },
      { note: "Hot and cold water supply installed in bathroom", tags: { work_type: "plumbing", trade_category: "plumber", location_in_building: "bathroom", completion_stage: "rough-in", condition_flag: "pass", building_element: "pipework", milestone_match: true } },
      { note: "Consumer unit fitted in utility cupboard — needs second check", tags: { work_type: "electrical", trade_category: "electrician", location_in_building: "utility", completion_stage: "first fix", condition_flag: "concern", building_element: "consumer unit", milestone_match: true, ai_comment: "Cable routing tight near board — recommend review" } },
      { note: "Foundation pour day 2 — south side", tags: { work_type: "groundwork", trade_category: "groundworker", location_in_building: "foundations", completion_stage: "complete", condition_flag: "pass", building_element: "concrete", milestone_match: true } },
      { note: "Steel beam in place above kitchen opening", tags: { work_type: "structural", trade_category: "steelwork", location_in_building: "ground floor", completion_stage: "complete", condition_flag: "pass", building_element: "beam", milestone_match: true } },
      { note: "Drylining started on first floor", tags: { work_type: "plastering", trade_category: "plasterer", location_in_building: "first floor", completion_stage: "in-progress", condition_flag: "pass", building_element: "wall", milestone_match: true } },
    ];
    let photoIdx = 0;
    for (const m of evidenceTargets) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const s = samples[(photoIdx + i) % samples.length];
        const gps = jitterGps();
        const submittedAt = new Date(Date.now() - (photoIdx + i) * 36 * 60 * 60 * 1000).toISOString();
        evidenceItems.push({
          milestone_id: m.id,
          submitted_by: user.id,
          channel: i % 3 === 0 ? "whatsapp" : "app",
          note: s.note,
          ai_tags: s.tags,
          photo_url: DEMO_PHOTOS[photoIdx % DEMO_PHOTOS.length],
          gps_lat: gps.lat,
          gps_lng: gps.lng,
          latitude: gps.lat,
          longitude: gps.lng,
          submitted_at: submittedAt,
          quality_assessment: m.position <= 3 ? "satisfactory" : null,
          verification_level: m.position <= 3 ? 3 : 1,
        });
        photoIdx++;
      }
    }
    if (evidenceItems.length) {
      const { error: eErr } = await admin.from("evidence").insert(evidenceItems);
      if (eErr) throw eErr;
    }

    // 5. Payment certificates for milestones 1, 2, 3 (mix of statuses)
    const completeMilestones = mData.filter((m: any) => [1, 2, 3].includes(m.position));
    if (completeMilestones.length) {
      const certs = completeMilestones.map((m: any, idx: number) => ({
        milestone_id: m.id,
        amount: m.payment_value,
        released_at: idx < 2 ? new Date(Date.now() - (idx + 1) * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        released_by: idx < 2 ? user.id : null,
        payment_status: idx < 2 ? "released" : "awaiting_client_authorization",
      }));
      const { error: cErr } = await admin.from("payment_certificates").insert(certs);
      if (cErr) throw cErr;
    }

    // 6. Seed audit trail entries for richer demo
    const changes = [
      { entity_type: "project", entity_name: project.name, change_type: "created", changed_by_name: "anna p." },
      { entity_type: "member", entity_name: "mark t.", change_type: "created", changed_by_name: "anna p." },
      { entity_type: "member", entity_name: "sarah k.", change_type: "created", changed_by_name: "anna p." },
      { entity_type: "milestone", entity_name: "site setup and demolition", change_type: "approved", changed_by_name: "anna p." },
      { entity_type: "milestone", entity_name: "foundations and groundwork", change_type: "approved", changed_by_name: "anna p." },
      { entity_type: "payment", entity_name: "site setup and demolition", change_type: "authorized", changed_by_name: "james r." },
      { entity_type: "payment", entity_name: "foundations and groundwork", change_type: "authorized", changed_by_name: "james r." },
      { entity_type: "milestone", entity_name: "structural frame and roof", change_type: "approved", changed_by_name: "anna p." },
    ];
    const { error: chErr } = await admin.from("project_changes").insert(
      changes.map((c, i) => ({
        ...c,
        project_id: pid,
        changed_by: user.id,
        created_at: new Date(Date.now() - (changes.length - i) * 8 * 60 * 60 * 1000).toISOString(),
      }))
    );
    if (chErr) console.error("changes seed error", chErr);

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
