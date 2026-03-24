-- Add email column to project_members for invite matching
ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS email text;

-- Create a function to auto-claim invitations when a user logs in
-- This runs as SECURITY DEFINER so it can update project_members regardless of RLS
CREATE OR REPLACE FUNCTION public.claim_invitations_for_user(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.project_members
  SET user_id = _user_id,
      status = 'active',
      joined_at = now()
  WHERE email = lower(_email)
    AND user_id IS NULL
    AND status = 'invited';
END;
$$;