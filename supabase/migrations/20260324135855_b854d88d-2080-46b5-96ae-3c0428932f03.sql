
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_code text UNIQUE;

CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.project_code := 'CMT-' || upper(substring(md5(random()::text) from 1 for 5));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_code
BEFORE INSERT ON projects
FOR EACH ROW
WHEN (NEW.project_code IS NULL)
EXECUTE FUNCTION generate_project_code();
