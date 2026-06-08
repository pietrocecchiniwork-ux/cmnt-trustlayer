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

  let body: { ontology_version?: string; chunks?: InputChunk[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ontologyVersion = body.ontology_version ?? "1.0";
  const chunks = body.chunks ?? [];
  if (chunks.length === 0) {
    return new Response(JSON.stringify({ error: "chunks[] required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // Ensure a "virtual" project_document row exists to anchor the global chunks
    const globalDocId = "00000000-0000-0000-0000-000000000001";
    const { error: docErr } = await admin
      .from("project_documents")
      .upsert(
        {
          id: globalDocId,
          project_id: null,
          uploaded_by: null,
          title: `Cemento LCM UK Construction Ontology v${ontologyVersion}`,
          kind: "ontology",
          file_path: `ontology/v${ontologyVersion}`,
          mime_type: "application/json",
          byte_size: JSON.stringify(chunks).length,
          status: "processing",
          is_global: true,
        },
        { onConflict: "id" }
      );
    if (docErr) throw new Error(`Doc upsert failed: ${docErr.message}`);

    // Delete prior global chunks (idempotent re-seed)
    await admin.from("knowledge_chunks").delete().eq("document_id", globalDocId);

    const BATCH = 32;
    const rows: Array<{
      document_id: string;
      project_id: null;
      chunk_index: number;
      content: string;
      embedding: string;
      token_estimate: number;
      source_key: string;
    }> = [];

    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embs = await embedBatch(
        slice.map((c) => c.content),
        apiKey
      );
      slice.forEach((c, j) => {
        rows.push({
          document_id: globalDocId,
          project_id: null,
          chunk_index: i + j,
          content: c.content,
          embedding: `[${embs[j].join(",")}]`,
          token_estimate: Math.ceil(c.content.length / 4),
          source_key: c.source_key,
        });
      });
    }

    const { error: insErr } = await admin.from("knowledge_chunks").insert(rows);
    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    await admin
      .from("project_documents")
      .update({ status: "ready", error: null })
      .eq("id", globalDocId);

    return new Response(
      JSON.stringify({ ok: true, chunks: rows.length, ontology_version: ontologyVersion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seed-global-knowledge error:", err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
