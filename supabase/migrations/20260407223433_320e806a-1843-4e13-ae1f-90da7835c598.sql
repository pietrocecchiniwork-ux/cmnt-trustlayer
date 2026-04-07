
ALTER TABLE public.payment_certificates ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'awaiting_client_authorization';

ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'disputed';

CREATE POLICY "Clients can update payment certificates"
ON public.payment_certificates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM milestones m
    WHERE m.id = payment_certificates.milestone_id
    AND get_project_role(auth.uid(), m.project_id) = 'client'
  )
);
