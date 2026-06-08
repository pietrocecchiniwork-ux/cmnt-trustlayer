
ALTER TABLE public.contract_extractions ADD COLUMN IF NOT EXISTS file_path text;

-- Storage policies for contracts bucket. Path: contracts/{projectId}/{uuid}/{filename}
CREATE POLICY "Members can view their project's contract files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
  AND public.is_project_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "PMs and clients can upload contract files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND public.get_project_role(auth.uid(), (storage.foldername(name))[1]::uuid) IN ('pm','client')
);

CREATE POLICY "PMs and clients can delete contract files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND public.get_project_role(auth.uid(), (storage.foldername(name))[1]::uuid) IN ('pm','client')
);
