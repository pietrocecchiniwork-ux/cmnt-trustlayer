import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MVP: Simulated extraction — returns pre-loaded Kensington Mews example
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const milestones = [
    { name: "site setup and demolition", due_date: "2026-01-10", payment_value: 8000, trade: "general", description: "Clear site, set up welfare facilities and skip" },
    { name: "foundations and groundwork", due_date: "2026-01-28", payment_value: 15000, trade: "general", description: "Excavation, rebar placement, concrete pour" },
    { name: "structural frame and roof", due_date: "2026-02-20", payment_value: 22000, trade: "carpentry", description: "Steel frame erection, roof trusses, felt and battens" },
    { name: "first fix — electrical and plumbing", due_date: "2026-03-08", payment_value: 11000, trade: "plumbing", description: "Rough-in electrical and plumbing throughout" },
    { name: "plastering and drylining", due_date: "2026-03-22", payment_value: 9000, trade: "plastering", description: "Board and plaster all internal walls" },
    { name: "second fix and joinery", due_date: "2026-04-10", payment_value: 14000, trade: "carpentry", description: "Doors, skirting, architrave, kitchen units" },
    { name: "decoration and finishing", due_date: "2026-04-28", payment_value: 7000, trade: "painting", description: "Paint, tile, floor covering throughout" },
    { name: "final inspection and handover", due_date: "2026-05-12", payment_value: 6000, trade: "general", description: "Snagging, building control sign-off, client walkthrough" },
  ];

  return new Response(JSON.stringify(milestones), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
