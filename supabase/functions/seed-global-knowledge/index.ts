import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InputChunk {
  source_key: string;
  content: string;
}

const GLOBAL_DOC_ID = "00000000-0000-0000-0000-000000000001";

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: texts }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    mode?: "init" | "batch" | "finalize";
    ontology_version?: string;
    chunks?: InputChunk[];
    start_index?: number;
    total?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const ontologyVersion = body.ontology_version ?? "1.0";
  const mode = body.mode ?? "batch";

  try {
    if (mode === "init") {
      const total = body.total ?? 0;
      const { error: docErr } = await admin
        .from("project_documents")
        .upsert(
          {
            id: GLOBAL_DOC_ID,
            project_id: null,
            uploaded_by: null,
            title: `Cemento LCM UK Construction Ontology v${ontologyVersion}`,
            kind: "ontology",
            file_path: `ontology/v${ontologyVersion}`,
            mime_type: "application/json",
            byte_size: total,
            status: "processing",
            error: null,
            is_global: true,
          },
          { onConflict: "id" }
        );
      if (docErr) throw new Error(`Doc upsert failed: ${docErr.message}`);
      const { error: delErr } = await admin
        .from("knowledge_chunks")
        .delete()
        .eq("document_id", GLOBAL_DOC_ID);
      if (delErr) throw new Error(`Reset failed: ${delErr.message}`);
      return new Response(JSON.stringify({ ok: true, mode, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "finalize") {
      await admin
        .from("project_documents")
        .update({ status: "ready", error: null })
        .eq("id", GLOBAL_DOC_ID);
      return new Response(JSON.stringify({ ok: true, mode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode === "batch"
    const chunks = body.chunks ?? [];
    const startIndex = body.start_index ?? 0;
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ error: "chunks[] required for batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embs = await embedBatch(chunks.map((c) => c.content), apiKey);
    const rows = chunks.map((c, j) => ({
      document_id: GLOBAL_DOC_ID,
      project_id: null,
      chunk_index: startIndex + j,
      content: c.content,
      embedding: `[${embs[j].join(",")}]`,
      token_estimate: Math.ceil(c.content.length / 4),
      source_key: c.source_key,
    }));

    const { error: insErr } = await admin.from("knowledge_chunks").insert(rows);
    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    return new Response(
      JSON.stringify({ ok: true, mode, inserted: rows.length, start_index: startIndex }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = String((err as Error).message ?? err);
    console.error("seed-global-knowledge error:", message);
    // Mark doc failed when something goes wrong mid-flight
    try {
      await admin
        .from("project_documents")
        .update({ status: "failed", error: message })
        .eq("id", GLOBAL_DOC_ID);
    } catch (_) {
      // ignore
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
