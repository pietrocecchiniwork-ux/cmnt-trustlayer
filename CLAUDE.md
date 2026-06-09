## SESSION RULES

1. SUPABASE PROJECT — The live app uses Lovable Cloud Supabase: nwshkwwjagsqembvuqrm. The project ltjzcmivrmkkjsaypcxs is disconnected and irrelevant. Never run SQL against the wrong project.

2. VERIFY BEFORE STATING — Read files before claiming they exist or work. Never say "this is already built" without checking. Run git pull before any codebase audit.

3. TOOL AUTHORITY — Lovable owns: UI, auth, OAuth. Claude Code owns: business logic, database schema, edge functions. Never attempt to fix Lovable auth issues through Claude Code.

4. LCM FIELDS — Every evidence submission must populate: file_hash, gps_lat, gps_lng, ai_tags_original, verification_level, training_eligible, label_dimensions_captured. If these are not being set, flag it immediately.

5. MILESTONE MODES — Mode A: milestone without tasks, evidence submitted directly against milestone. Mode B: milestone with tasks, evidence submitted against individual tasks. Every milestone must have an assigned_to. No unassigned milestones.

6. CHANGE LOGGING — Every mutation (name change, date change, assignment change, status change) must write to project_changes. If a mutation doesn't log, flag it.

7. ONTOLOGY TABLES — ontology_phases, ontology_trades, ontology_materials, ontology_standards, ontology_defects, ontology_evidence_types exist in the database. Evidence should reference ontology_phase_id and ontology_trade_id where possible.
