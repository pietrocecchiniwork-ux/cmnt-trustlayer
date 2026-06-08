import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured", chunks: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { project_id?: string; query?: string; k?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON", chunks: [] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { project_id, query, k = 5 } = body;
  if (!project_id || !query) {
    return new Response(JSON.stringify({ error: "project_id and query required", chunks: [] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query }),
    });
    if (!embRes.ok) {
      const err = await embRes.text();
      console.error("Embedding error:", embRes.status, err);
      return new Response(JSON.stringify({ chunks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const embData = await embRes.json();
    const embedding: number[] = embData.data[0].embedding;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.rpc("match_project_chunks", {
      _project_id: project_id,
      _query_embedding: `[${embedding.join(",")}]`,
      _match_count: k,
    });

    if (error) {
      console.error("match_project_chunks error:", error);
      return new Response(JSON.stringify({ chunks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ chunks: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("retrieve-knowledge error:", err);
    return new Response(JSON.stringify({ chunks: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
