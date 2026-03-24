
ALTER TABLE evidence 
ADD COLUMN IF NOT EXISTS file_hash text,
ADD COLUMN IF NOT EXISTS file_size_bytes integer,
ADD COLUMN IF NOT EXISTS verification_level integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS training_eligible boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS label_dimensions_captured integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS ai_tags_original jsonb,
ADD COLUMN IF NOT EXISTS human_override boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS quality_assessment text,
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS gps_lat numeric,
ADD COLUMN IF NOT EXISTS gps_lng numeric,
ADD COLUMN IF NOT EXISTS evidence_code text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;
