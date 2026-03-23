-- Add evidence_code, latitude, longitude to evidence table for LCM data quality
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS evidence_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;
