
-- Add whatsapp to evidence_channel enum if not already there
DO $$ BEGIN
  ALTER TYPE evidence_channel ADD VALUE IF NOT EXISTS 'whatsapp';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- WhatsApp identities: verified phone -> user
CREATE TABLE IF NOT EXISTS public.whatsapp_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_identities_user ON public.whatsapp_identities(user_id);

ALTER TABLE public.whatsapp_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own whatsapp identity"
  ON public.whatsapp_identities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete their own whatsapp identity"
  ON public.whatsapp_identities FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- OTP verification codes (managed by edge functions via service role)
CREATE TABLE IF NOT EXISTS public.whatsapp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_phone ON public.whatsapp_verifications(phone_number) WHERE consumed_at IS NULL;

ALTER TABLE public.whatsapp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verifications"
  ON public.whatsapp_verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Extend whatsapp_sessions
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS last_milestone_id UUID,
  ADD COLUMN IF NOT EXISTS last_evidence_id UUID,
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_id UUID;
