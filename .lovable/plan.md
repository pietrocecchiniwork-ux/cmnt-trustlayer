
# Permanent AI Knowledge: Cemento LCM Ontology

The two PDFs become Cemento's **built-in brain**. Every AI call on every project gets this context automatically, in addition to anything uploaded to per-project Knowledge.

## Two-layer architecture

Cemento AI will now see:
1. **Global ontology** (this plan) — version-controlled in the repo, available on every project, no upload required.
2. **Project knowledge** (already built) — per-project documents uploaded via `/project/knowledge`.

The retrieval layer merges both. Project-specific chunks rank higher when relevant; otherwise the AI falls back on the global ontology.

## Compact taxonomy vs deep knowledge

The PDFs contain two kinds of information that need different treatment:

| Kind | Examples | How injected |
|---|---|---|
| **Compact taxonomy** (small, stable) | 33 phase names + IDs, 18 trades, defect catalogue | Always-present in the prompt as a structured "Cemento construction ontology" block. ~1.5K tokens. |
| **Deep knowledge** (long, numeric) | 80 compliance thresholds, defect detection signatures, install parameters, sequence rules | Embedded as global chunks, retrieved top-k per query alongside project chunks. |

This keeps every AI call cheap and consistent without burning tokens on irrelevant numbers.

## Data files in the repo

New folder `src/data/ontology/`:

- `phases.ts` — 33 phases (id, name, riba_stage, project_types, duration_weeks, trades_active, evidence_expected, governing_standards)
- `trades.ts` — 18 trades (id, name, citb_classification, typical_defects, evidence_of_work)
- `materials.ts` — ~20 materials (id, name, key_standard, installed_by)
- `standards.ts` — ~30 BS / Approved Documents (id, reference, title, primary_trades)
- `defects.ts` — ~20 defects (id, name, severity, phase, trade, standards_violated, visual_description)
- `evidence_types.ts` — ~20 evidence types (id, name, can_trigger_payment, phases_generated)
- `compliance.ts` — ~80 quantitative thresholds (entity_id, parameter, value, unit, condition, value_type, source)
- `relationships.ts` — phase↔trade, phase↔standard, defect↔entity, predecessor sequences
- `index.ts` — exports `ONTOLOGY` + helpers like `getPhaseById`, `getTradesForPhase`, `getCompactTaxonomyPrompt()`

All values come straight from the two PDFs with the citations preserved. Items marked `[NOT FOUND]` or `[UNVERIFIED]` in the source carry a flag so they're never quoted as definitive.

## Database

Schema choice: add `is_global boolean` to `project_documents` and allow `project_id` to be NULL on `knowledge_chunks` for the global rows. Cleaner than a parallel table because retrieval can union them in one query.

Migration:
- `alter table public.project_documents alter column project_id drop not null`
- `alter table public.project_documents add column is_global boolean not null default false`
- `alter table public.knowledge_chunks alter column project_id drop not null`
- Update `match_project_chunks` → `match_chunks(_project_id uuid, _query_embedding, _match_count)` that returns both global rows AND rows for that project, with global ranked slightly lower so project-specific evidence wins ties
- RLS: any authenticated user can `select` global rows; only `service_role` can insert/update/delete them

## Seeding the deep knowledge

New edge function `seed-global-knowledge`:

- Reads `src/data/ontology/compliance.ts`, `defects.ts`, `relationships.ts` via a bundled JSON copy
- Generates one readable chunk per entity, e.g.:
  - *"Defect DEF-002 Fire Stopping — Significant. Phase PH-016. Trade: any. Standards: Approved Document B, BS 476-20. Visual signature: visible gaps around services penetrating compartment walls/floors, missing intumescent collars on plastic pipes, untreated penetrations…"*
  - *"PH-005 Foundations — strip foundation depth in shrinkable clay with no trees: ≥750mm (AD Part A Table 12, NHBC Standards 2024 Ch.4.2). With trees within H/2: ≥900mm. Trees H/2–H: ≥1000mm. Downhill of trees: ≥1200mm."*
- Embeds via Lovable AI `openai/text-embedding-3-small` (same model as project knowledge — keeps vectors comparable)
- Upserts into `knowledge_chunks` with `project_id = NULL`, deduped by a `source_key` column (`source_key text unique` added to chunks)
- Idempotent — safe to re-run after every ontology edit

Triggered:
- Once at first install (manual button in the new admin page)
- Re-run whenever the ontology files change (one-click)

## Prompt changes

`tag-evidence/index.ts`:
- Prepend the compact taxonomy block (always present, ~1.5K tokens) at the top of the prompt so Claude can map photos to phase IDs / trade IDs / defect IDs from the canonical list rather than inventing labels
- Add new optional output fields: `phase_id`, `defect_ids[]`, `standards_referenced[]` — pulled from the canonical lists; existing fields stay for backwards compatibility
- Knowledge retrieval already feeds in via `retrieve-knowledge`; now those results include global chunks too

`extract-milestones/index.ts`:
- Same compact taxonomy prepended so extracted milestones snap to the 33 known phases (better matching to construction templates downstream)

`retrieve-knowledge/index.ts`:
- Call the new `match_chunks` SQL function (project + global in one shot)

## UI

New route `/admin/ontology` (visible only when the role-switcher dev pill says PM, and only to a hard-coded admin email list initially):

- Sections: Phases (33), Trades (18), Materials, Standards, Defects, Evidence, Compliance values (search by entity)
- Shows entity count, last seed timestamp, "Re-seed global knowledge" button (calls `seed-global-knowledge`)
- Read-only browser — editing happens via PR to the TS files. Keeps the source-of-truth versioned and reviewable.

No change to the existing per-project Knowledge screen — the AI now just knows more out of the box.

## Files touched

**New**
- `src/data/ontology/{phases,trades,materials,standards,defects,evidence_types,compliance,relationships,index}.ts`
- `supabase/functions/seed-global-knowledge/index.ts`
- `src/pages/AdminOntology.tsx`

**Modified**
- Migration: nullable project_id on `knowledge_chunks` + `project_documents`, `is_global`, `source_key`, updated `match_chunks` function and RLS
- `supabase/functions/tag-evidence/index.ts` (compact taxonomy + new optional output fields)
- `supabase/functions/extract-milestones/index.ts` (compact taxonomy)
- `supabase/functions/retrieve-knowledge/index.ts` (use `match_chunks`)
- `src/App.tsx` (route)
- `src/components/BurgerMenu.tsx` (admin link, gated)

## Rollout

1. Migration
2. Ontology TS files (transcribed from the PDFs verbatim, citations preserved)
3. Seed function + admin page
4. Click "Re-seed" once to populate the global chunks
5. Wire compact taxonomy into the two AI prompts

Existing project knowledge keeps working unchanged. The originals PDFs themselves are kept under `src/data/ontology/source/` for traceability but are not loaded at runtime — the structured TS is the source of truth.
