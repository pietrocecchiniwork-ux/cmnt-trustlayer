## Goal
Ensure the live Lovable Cloud backend project `nwshkwwjagsqembvuqrm` has a private storage bucket named exactly `contracts`, without changing any app code, database tables, edge functions, ontology, flags, training signals, or ingestion flow.

## Current read-only verification
- Active backend project ref: `nwshkwwjagsqembvuqrm`
- `storage.buckets` currently shows a row for `contracts` with `public = false`
- Existing storage object policies are bound to `bucket_id = 'contracts'`
- Existing policies use `storage.foldername(name)[1]::uuid` for project-scoped paths

## Implementation plan
1. Use the Cloud Storage bucket API/tool to create or reconcile the `contracts` bucket as private (`public = false`).
   - If the bucket already exists according to the bucket API, leave it private and do not duplicate it.
   - If the API reports missing, create it through the storage bucket tool, not raw SQL.
2. Re-check bucket state through the backend:
   - List/query bucket metadata for `contracts`
   - Confirm `public = false`
   - Confirm the active project ref remains `nwshkwwjagsqembvuqrm`
3. Re-check policy binding:
   - Confirm policies still reference `bucket_id = 'contracts'`
   - Confirm path scoping still uses `storage.foldername(name)[1]`
4. Confirm the user-facing outcome plainly:
   - Bucket `contracts` exists in project `nwshkwwjagsqembvuqrm`
   - Bucket is private
   - Existing RLS policies bind to it
   - Bucket fetch/list no longer behaves as missing

## Explicit non-changes
- No changes to `extract-milestones`
- No changes to `DocumentUpload`
- No changes to `contract_extractions` or `file_path`
- No changes to generated types
- No changes to ontology, flags/suggestions UI, training-signal writes, `tag-evidence`, or `knowledge_chunks`