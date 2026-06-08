
# Project Knowledge (Ontology) for Cemento AI

Today Cemento has no knowledge store — the AI only sees the fixed taxonomy hard-coded in `tag-evidence/index.ts` plus the current milestone/task. This plan adds a **per-project knowledge library** where you can upload reference files (spec, JCT, drawings list, method statements, NHBC notes, internal SOPs). The AI then pulls the most relevant excerpts into every `tag-evidence` and `extract-milestones` call.

Retrieval recommendation: **semantic search (RAG)** with `pgvector`. Cemento is text-heavy and you'll quickly outgrow "stuff the whole doc in the prompt" — RAG keeps token costs and accuracy stable as the library grows.

## What you'll be able to do

- Open a project → **Knowledge** screen → drag a PDF / DOCX / image / TXT.
- Cemento extracts text, splits it into chunks, embeds them, and stores them against the project.
- Each chunk gets a kind tag: `spec`, `contract`, `drawing_note`, `standard`, `sop`, `other` (editable).
- When AI tags a photo or extracts milestones, it fetches the top 4–6 most relevant chunks and injects them as extra context.
- You see, rename, retag, and delete documents on the same screen.

## Data model

New private bucket `project-knowledge` (PDFs/DOCX/images stored here, never public).

Two new tables:

- `project_documents` — one row per uploaded file
  - `id`, `project_id`, `uploaded_by`, `title`, `kind`, `file_path`, `mime_type`, `byte_size`, `status` (`processing` | `ready` | `failed`), `error`, `created_at`
- `knowledge_chunks` — one row per text chunk
  - `id`, `document_id`, `project_id`, `chunk_index`, `content` (text), `embedding` (`vector(1536)`), `token_estimate`, `created_at`
  - HNSW index on `embedding` with `vector_cosine_ops`
  - `pgvector` extension enabled

RLS: only active members of the project can read/write. Service role can do everything (used by edge functions). PMs can delete; any member can upload (matches your "doesn't matter" answer — easy to tighten later).

## Edge functions

1. **`ingest-document`** (new)
   - Input: `document_id`
   - Downloads the file from storage, extracts text (PDF via `pdf-parse`/`unpdf`, DOCX via `mammoth`, images via Gemini vision OCR, txt direct)
   - Chunks at ~1000 chars with ~150 overlap
   - Embeds each chunk via Lovable AI Gateway `openai/text-embedding-3-small` (1536 dims, cheap)
   - Inserts `knowledge_chunks`, sets `project_documents.status = 'ready'`

2. **`retrieve-knowledge`** (new, internal helper)
   - Input: `project_id`, `query` (string), `k` (default 5)
   - Embeds the query, runs `match_project_chunks(project_id, query_embedding, k)` SQL function, returns top chunks with similarity scores
   - Reused by both AI functions below

3. **`tag-evidence`** (modify)
   - Before calling Claude, build a query string from `milestone_name + task_name + project_name`
   - Call `retrieve-knowledge`; append the chunks to the prompt under a `Project knowledge:` section
   - Everything else stays the same (same model, same JSON output)

4. **`extract-milestones`** (modify)
   - After first extraction pass, run a second query using `project_name + "contract milestones payment stages"` to pull relevant chunks, then re-prompt for a refined list. Optional: skip if no chunks exist (keeps current behaviour for projects without knowledge).

## UI

New route `/project/knowledge` (PM nav + project menu):

- Header: "Project knowledge" + count
- Drop zone (PDF, DOCX, JPG, PNG, TXT) — same visual language as `DocumentUpload.tsx`
- List of documents: title, kind chip, status pill (`processing` → spinner, `ready` → green dot, `failed` → red), file size, uploaded by/when, delete button
- Click a row → drawer showing extracted text preview + first 3 chunks (for trust)
- Empty state: "Cemento learns from your project documents. Drop a spec, contract, or method statement to start."

Small badge on `MilestoneDetailPage` / evidence cards: "AI used N knowledge sources" (when chunks were injected) so you can see it's working.

## Rollout

Phase 1 (this plan): bucket + tables + ingest + retrieve + wire into `tag-evidence` + Knowledge screen.
Phase 2 (later, if you want): wire into `extract-milestones`, global org-wide standards library, per-chunk feedback ("this chunk was useful / not useful") to improve retrieval.

## Files touched

- New: `supabase/functions/ingest-document/index.ts`, `supabase/functions/retrieve-knowledge/index.ts`, `src/pages/ProjectKnowledge.tsx`, migration for tables + pgvector + RLS + `match_project_chunks` function
- Modified: `supabase/functions/tag-evidence/index.ts` (add retrieval call), `src/App.tsx` (route), `src/components/BurgerMenu.tsx` or nav (link), `src/i18n/en.ts` + `it.ts`

Nothing in the existing milestone / evidence / payment flows changes shape — this is purely additive context for the AI.
