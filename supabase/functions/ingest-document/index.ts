import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(i, end));
    if (end >= clean.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractFromImage(base64: string, mimeType: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: "text", text: "Extract ALL readable text from this construction document image. Return plain text only — no commentary, no markdown." },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

  const admin = createClient(supabaseUrl, serviceKey);

  let body: { document_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { document_id } = body;
  if (!document_id) {
    return new Response(JSON.stringify({ error: "document_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: doc, error: docErr } = await admin
    .from("project_documents")
    .select("*")
    .eq("id", document_id)
    .single();

  if (docErr || !doc) {
    return new Response(JSON.stringify({ error: "Document not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Download
    const { data: blob, error: dlErr } = await admin.storage
      .from("project-knowledge")
      .download(doc.file_path);
    if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message}`);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mime = doc.mime_type ?? "application/octet-stream";

    // Extract text
    let text = "";
    if (mime === "application/pdf" || doc.file_path.toLowerCase().endsWith(".pdf")) {
      text = await extractFromPdf(bytes);
    } else if (mime.startsWith("image/")) {
      text = await extractFromImage(bytesToBase64(bytes), mime, apiKey);
    } else if (mime.startsWith("text/") || doc.file_path.toLowerCase().endsWith(".txt") || doc.file_path.toLowerCase().endsWith(".md")) {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } else if (mime.includes("wordprocessingml") || doc.file_path.toLowerCase().endsWith(".docx")) {
      // Best-effort: extract visible text from the docx zip's document.xml
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      text = decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    } else {
      throw new Error(`Unsupported file type: ${mime}`);
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await admin
        .from("project_documents")
        .update({ status: "failed", error: "No text extracted from document" })
        .eq("id", document_id);
      return new Response(JSON.stringify({ error: "No text extracted" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Embed in batches of 32
    const BATCH = 32;
    const rows: Array<{
      document_id: string;
      project_id: string;
      chunk_index: number;
      content: string;
      embedding: string;
      token_estimate: number;
    }> = [];

    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embs = await embedBatch(slice, apiKey);
      slice.forEach((content, j) => {
        rows.push({
          document_id,
          project_id: doc.project_id,
          chunk_index: i + j,
          content,
          embedding: `[${embs[j].join(",")}]`,
          token_estimate: Math.ceil(content.length / 4),
        });
      });
    }

    const { error: insErr } = await admin.from("knowledge_chunks").insert(rows);
    if (insErr) throw new Error(`Insert chunks failed: ${insErr.message}`);

    await admin
      .from("project_documents")
      .update({ status: "ready", error: null })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ ok: true, chunks: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ingest-document error:", err);
    await admin
      .from("project_documents")
      .update({ status: "failed", error: String((err as Error).message ?? err) })
      .eq("id", document_id);
    return new Response(
      JSON.stringify({ error: String((err as Error).message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
