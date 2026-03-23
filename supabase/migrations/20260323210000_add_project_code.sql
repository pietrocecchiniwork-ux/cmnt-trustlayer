-- Add project_code column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_code text UNIQUE;

-- Function to generate a random CMT-XXXXXX code
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'CMT-';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-set project_code before insert
CREATE OR REPLACE FUNCTION set_project_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.project_code IS NULL THEN
    LOOP
      NEW.project_code := generate_project_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM projects WHERE project_code = NEW.project_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_project_code ON projects;
CREATE TRIGGER trg_set_project_code
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION set_project_code();

-- Backfill existing projects that don't have a code
DO $$
DECLARE
  r record;
  new_code text;
BEGIN
  FOR r IN SELECT id FROM projects WHERE project_code IS NULL LOOP
    LOOP
      new_code := generate_project_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM projects WHERE project_code = new_code);
    END LOOP;
    UPDATE projects SET project_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;
