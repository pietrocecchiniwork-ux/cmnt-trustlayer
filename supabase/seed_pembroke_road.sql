-- ============================================================
-- Demo seed: 42 Pembroke Road — Rear Extension
-- Supabase project: nwshkwwjagsqembvuqrm
--
-- Idempotent: safe to re-run after a database reset.
-- All UUIDs are fixed so re-runs are no-ops (ON CONFLICT DO NOTHING).
--
-- Demo login: demo@cemento.io / DemoCemento2026!
-- ============================================================

BEGIN;

DO $$
DECLARE
  -- ── Fixed UUIDs ────────────────────────────────────────────────
  -- Auth user
  v_uid          UUID := '00000000-cafe-0000-0000-000000000001';

  -- Project
  v_pid          UUID := '00000000-cafe-0000-0000-000000000010';

  -- Milestones
  v_m1           UUID := '00000000-cafe-0001-0000-000000000001';
  v_m2           UUID := '00000000-cafe-0001-0000-000000000002';
  v_m3           UUID := '00000000-cafe-0001-0000-000000000003';
  v_m4           UUID := '00000000-cafe-0001-0000-000000000004';
  v_m5           UUID := '00000000-cafe-0001-0000-000000000005';
  v_m6           UUID := '00000000-cafe-0001-0000-000000000006';
  v_m7           UUID := '00000000-cafe-0001-0000-000000000007';
  v_m8           UUID := '00000000-cafe-0001-0000-000000000008';

  -- Team members (project_members rows)
  v_mbr_pm       UUID := '00000000-cafe-0002-0000-000000000001';
  v_mbr_con      UUID := '00000000-cafe-0002-0000-000000000002';
  v_mbr_trade    UUID := '00000000-cafe-0002-0000-000000000003';
  v_mbr_client   UUID := '00000000-cafe-0002-0000-000000000004';

  -- Evidence: M1 (3 items)
  v_e1a          UUID := '00000000-cafe-0003-0001-000000000001';
  v_e1b          UUID := '00000000-cafe-0003-0001-000000000002';
  v_e1c          UUID := '00000000-cafe-0003-0001-000000000003';

  -- Evidence: M2 (3 items)
  v_e2a          UUID := '00000000-cafe-0003-0002-000000000001';
  v_e2b          UUID := '00000000-cafe-0003-0002-000000000002';
  v_e2c          UUID := '00000000-cafe-0003-0002-000000000003';

  -- Evidence: M3 (3 items)
  v_e3a          UUID := '00000000-cafe-0003-0003-000000000001';
  v_e3b          UUID := '00000000-cafe-0003-0003-000000000002';
  v_e3c          UUID := '00000000-cafe-0003-0003-000000000003';

  -- Evidence: M4 (2 items — in_review, not yet approved)
  v_e4a          UUID := '00000000-cafe-0003-0004-000000000001';
  v_e4b          UUID := '00000000-cafe-0003-0004-000000000002';

  -- Payment certificates
  v_cert1        UUID := '00000000-cafe-0004-0000-000000000001';
  v_cert2        UUID := '00000000-cafe-0004-0000-000000000002';
  v_cert3        UUID := '00000000-cafe-0004-0000-000000000003';

  -- Project changes (activity log) — fixed so re-run is idempotent
  v_chg01        UUID := '00000000-cafe-0005-0000-000000000001';
  v_chg02        UUID := '00000000-cafe-0005-0000-000000000002';
  v_chg03        UUID := '00000000-cafe-0005-0000-000000000003';
  v_chg04        UUID := '00000000-cafe-0005-0000-000000000004';
  v_chg05        UUID := '00000000-cafe-0005-0000-000000000005';
  v_chg06        UUID := '00000000-cafe-0005-0000-000000000006';
  v_chg07        UUID := '00000000-cafe-0005-0000-000000000007';
  v_chg08        UUID := '00000000-cafe-0005-0000-000000000008';
  v_chg09        UUID := '00000000-cafe-0005-0000-000000000009';
  v_chg10        UUID := '00000000-cafe-0005-0000-000000000010';
  v_chg11        UUID := '00000000-cafe-0005-0000-000000000011';
  v_chg12        UUID := '00000000-cafe-0005-0000-000000000012';
  v_chg13        UUID := '00000000-cafe-0005-0000-000000000013';

BEGIN

  -- ══════════════════════════════════════════════════════════════
  -- 1. Demo auth user  (demo@cemento.io / DemoCemento2026!)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    created_at,
    updated_at
  ) VALUES (
    v_uid,
    '00000000-0000-0000-0000-000000000000',
    'demo@cemento.io',
    crypt('DemoCemento2026!', gen_salt('bf')),
    now() - interval '90 days',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Sophie M."}',
    false,
    now() - interval '90 days',
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Auth identity required for email/password sign-in
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_uid,                          -- identity id = user id for email provider
    v_uid,
    jsonb_build_object(
      'sub',   v_uid::text,
      'email', 'demo@cemento.io'
    ),
    'email',
    v_uid::text,
    now() - interval '2 days',
    now() - interval '90 days',
    now()
  ) ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════
  -- 2. Project
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO public.projects (
    id, name, address,
    start_date, end_date,
    payment_mode, total_budget,
    project_code, created_by,
    created_at
  ) VALUES (
    v_pid,
    '42 Pembroke Road — Rear Extension',
    '42 Pembroke Road, London W8 6NX',
    '2026-02-03',
    '2026-07-18',
    true,
    92000,
    'PEM42-RE',
    v_uid,
    now() - interval '90 days'
  ) ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════
  -- 3. Milestones  (RIBA-aligned stages for a rear extension)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO public.milestones (
    id, project_id,
    name, description,
    position, due_date, payment_value,
    status, created_from,
    approved_by, approved_at,
    assigned_to_name,
    checklist, created_at
  ) VALUES

    -- M1 — complete
    ( v_m1, v_pid,
      'Site setup & demolition',
      'Erect hoarding and site compound. Locate and cap existing services. '
      'Asbestos survey and clearance certificate obtained. '
      'Controlled demolition to existing rear outrigger.',
      1, '2026-02-14', 8000,
      'complete', 'manual',
      v_uid, now() - interval '78 days',
      'Dan Hargreaves',
      '["site hoarding erected","welfare facilities installed","existing services located and marked","asbestos survey completed","skip and waste management in place"]',
      now() - interval '90 days' ),

    -- M2 — complete
    ( v_m2, v_pid,
      'Foundations & groundworks',
      'Excavate strip foundations to engineer-specified depth. '
      'Concrete pour with building control stage inspection. '
      'DPC and DPM laid, ground-bearing slab poured and cured.',
      2, '2026-03-05', 15000,
      'complete', 'manual',
      v_uid, now() - interval '60 days',
      'Dan Hargreaves',
      '["trial holes dug","foundation trenches excavated to correct depth","concrete poured and building control inspection passed","damp proof membrane laid","ground-bearing slab complete"]',
      now() - interval '90 days' ),

    -- M3 — complete
    ( v_m3, v_pid,
      'Structural frame & flat roof',
      'Install RSJ over new rear opening with padstones. '
      'Form new blockwork walls to extension. '
      'Construct warm flat roof deck with EPDM waterproofing membrane and upstands.',
      3, '2026-03-28', 22000,
      'complete', 'manual',
      v_uid, now() - interval '42 days',
      'Dan Hargreaves',
      '["RSJ installed and padstones set","structural engineer sign-off obtained","new blockwork walls to extension complete","flat roof deck formed","EPDM membrane bonded and flashings complete"]',
      now() - interval '90 days' ),

    -- M4 — in_review (evidence submitted, awaiting PM approval)
    ( v_m4, v_pid,
      'First fix electrical & plumbing',
      'Run cable routes through joists and studwork. '
      'Set consumer unit position in utility cupboard. '
      'Run soil and waste pipes to new WC. '
      'Hot and cold supply pipework to extension kitchen and WC.',
      4, '2026-04-16', 11000,
      'in_review', 'manual',
      NULL, NULL,
      'Yusuf Okafor',
      '["consumer unit position set","cable routes run","soil and waste pipes run","hot and cold supply pipes run","earth bonding completed"]',
      now() - interval '90 days' ),

    -- M5 — pending
    ( v_m5, v_pid,
      'Plastering & drylining',
      'Dot-and-dab plasterboard to external cavity walls. '
      'Wet plaster scratch coat and skim to extension walls. '
      'Reveal beads and coving grounds fitted.',
      5, '2026-05-02', 9000,
      'pending', 'manual',
      NULL, NULL,
      NULL,
      '["dot and dab or studwork drylining fixed","coving grounds fixed","wet plaster scratch coat applied","finish coat skimmed","reveals and beads finished"]',
      now() - interval '90 days' ),

    -- M6 — pending
    ( v_m6, v_pid,
      'Second fix & joinery',
      'Hang internal doors. Fix skirting and architrave. '
      'Fit sockets, switches and light fittings. '
      'Install sanitaryware in new WC.',
      6, '2026-05-23', 12000,
      'pending', 'manual',
      NULL, NULL,
      NULL,
      '["skirting and architrave fixed","doors hung","sockets and switches fitted","light fittings installed","sanitaryware fitted"]',
      now() - interval '90 days' ),

    -- M7 — pending
    ( v_m7, v_pid,
      'Decoration & floor finishes',
      'Mist coat and two full coats emulsion throughout. '
      'Gloss to all woodwork. '
      'Lay engineered oak flooring to extension with underlay. '
      'Floor thresholds and trims fixed.',
      7, '2026-06-13', 8000,
      'pending', 'manual',
      NULL, NULL,
      NULL,
      '["mist coat applied","full emulsion applied","gloss to woodwork","engineered oak floor laid","thresholds and trims fixed"]',
      now() - interval '90 days' ),

    -- M8 — pending
    ( v_m8, v_pid,
      'Final inspection & handover',
      'Full snagging inspection with client. '
      'All defects remedied. '
      'Building control completion certificate obtained. '
      'O&M manuals, keys and guarantees handed to client.',
      8, '2026-07-04', 7000,
      'pending', 'manual',
      NULL, NULL,
      NULL,
      '["full snagging inspection completed","all defects remedied","building control completion certificate obtained","O&M manuals provided","keys and warranties handed over"]',
      now() - interval '90 days' )

  ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════
  -- 4. Team members
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO public.project_members (
    id, project_id,
    user_id, name, email,
    role, status, joined_at
  ) VALUES
    ( v_mbr_pm,     v_pid, v_uid, 'Sophie M.',       'demo@cemento.io',           'pm',         'active', now() - interval '90 days' ),
    ( v_mbr_con,    v_pid, NULL,  'Dan Hargreaves',   'dan.h@buildright.co.uk',    'contractor', 'active', now() - interval '88 days' ),
    ( v_mbr_trade,  v_pid, NULL,  'Yusuf Okafor',     'yusuf@yoelectrical.co.uk',  'trade',      'active', now() - interval '80 days' ),
    ( v_mbr_client, v_pid, NULL,  'Claire Ashworth',  'c.ashworth@gmail.com',      'client',     'active', now() - interval '89 days' )
  ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════
  -- 5. Evidence
  -- ══════════════════════════════════════════════════════════════

  -- ── M1: Site setup & demolition — 3 approved items ───────────
  INSERT INTO public.evidence (
    id, milestone_id, submitted_by,
    channel, photo_url, note,
    ai_tags,
    submitted_at,
    quality_assessment, verification_level,
    human_override, training_eligible, label_dimensions_captured,
    gps_lat, gps_lng
  ) VALUES

    ( v_e1a, v_m1, v_uid,
      'app',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
      'Hoarding erected on front and side elevations, site compound set up with welfare unit',
      '{
        "work_type":             "groundworks",
        "trade_category":        "main_contractor",
        "location_in_building":  "external",
        "completion_stage":      "groundworks",
        "condition_flag":        "pass",
        "building_element":      "other",
        "milestone_match":       true,
        "ai_comment":            "Site hoarding fully erected to highways standard. Welfare unit positioned within compound. Skip licence visible on gate. Consistent with site setup milestone — all enabling works evidenced."
      }',
      now() - interval '88 days',
      'satisfactory', 3, false, true, 2,
      51.4985, -0.1924 ),

    ( v_e1b, v_m1, v_uid,
      'app',
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
      'Rear outrigger partially demolished — acrow props supporting party wall',
      '{
        "work_type":             "structural",
        "trade_category":        "main_contractor",
        "location_in_building":  "external",
        "completion_stage":      "groundworks",
        "condition_flag":        "pass",
        "building_element":      "wall",
        "milestone_match":       true,
        "ai_comment":            "Controlled demolition underway to rear outrigger. Acrow props correctly positioned with sole plates — no unsupported spans visible. Safe working practices evident. Debris cleared from working area."
      }',
      now() - interval '86 days',
      'satisfactory', 3, false, true, 2,
      51.4986, -0.1922 ),

    ( v_e1c, v_m1, v_uid,
      'whatsapp',
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
      'Asbestos clearance certificate on site board — all areas clear, demolition can proceed',
      '{
        "work_type":             "groundworks",
        "trade_category":        "main_contractor",
        "location_in_building":  "external",
        "completion_stage":      "groundworks",
        "condition_flag":        "pass",
        "building_element":      "other",
        "milestone_match":       true,
        "ai_comment":            "Asbestos clearance certificate clearly legible and dated within current works period. Licensed analyst stamp visible. No ACMs detected in survey scope. Site cleared to proceed with structural demolition."
      }',
      now() - interval '84 days',
      'satisfactory', 3, false, true, 2,
      51.4984, -0.1921 ),


  -- ── M2: Foundations & groundworks — 3 approved items ─────────

    ( v_e2a, v_m2, v_uid,
      'app',
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
      'Strip foundation trench excavated — 900 mm deep, sides clean and vertical',
      '{
        "work_type":             "groundworks",
        "trade_category":        "groundworker",
        "location_in_building":  "foundation",
        "completion_stage":      "groundworks",
        "condition_flag":        "pass",
        "building_element":      "foundation",
        "milestone_match":       true,
        "ai_comment":            "Strip foundation trench at correct depth per engineer spec. Sides clean and vertical, no evidence of ground collapse or water ingress. Ground conditions appear suitable for founding level. Awaiting engineer sign-off before pour."
      }',
      now() - interval '75 days',
      'satisfactory', 3, false, true, 2,
      51.4985, -0.1923 ),

    ( v_e2b, v_m2, v_uid,
      'app',
      'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&q=80',
      'Concrete pour complete — south and west runs, vibration compaction applied',
      '{
        "work_type":             "groundworks",
        "trade_category":        "groundworker",
        "location_in_building":  "foundation",
        "completion_stage":      "groundworks",
        "condition_flag":        "pass",
        "building_element":      "foundation",
        "milestone_match":       true,
        "ai_comment":            "Concrete pour in progress. Mix consistency appears correct — no signs of segregation. Poker vibration being applied systematically. Formwork properly aligned with no visible deflection. Building control inspector present for stage check."
      }',
      now() - interval '72 days',
      'satisfactory', 3, false, true, 2,
      51.4983, -0.1922 ),

    ( v_e2c, v_m2, v_uid,
      'app',
      'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=1200&q=80',
      'DPC laid and lapped, 1200-gauge DPM installed — slab poured and curing',
      '{
        "work_type":             "groundworks",
        "trade_category":        "groundworker",
        "location_in_building":  "ground_floor",
        "completion_stage":      "groundworks",
        "condition_flag":        "pass",
        "building_element":      "floor",
        "milestone_match":       true,
        "ai_comment":            "Damp proof course correctly lapped minimum 150 mm at all junctions. 1200-gauge DPM visible and intact with no tears. Ground-bearing slab poured and surface finished — ready for building control inspection before any covering works."
      }',
      now() - interval '66 days',
      'satisfactory', 3, false, true, 2,
      51.4986, -0.1920 ),


  -- ── M3: Structural frame & flat roof — 3 approved items ──────

    ( v_e3a, v_m3, v_uid,
      'app',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
      'RSJ installed over rear opening — padstones both ends, structural engineer signed off',
      '{
        "work_type":             "structural",
        "trade_category":        "structural_engineer",
        "location_in_building":  "ground_floor",
        "completion_stage":      "shell",
        "condition_flag":        "pass",
        "building_element":      "frame",
        "milestone_match":       true,
        "ai_comment":            "RSJ correctly seated on padstones at both ends. Bearing length appears sufficient. Temporary propping removed — no visible deflection in beam. Structural engineer sign-off note pinned to site board. Lintel installation complete and inspected."
      }',
      now() - interval '57 days',
      'satisfactory', 3, false, true, 2,
      51.4987, -0.1924 ),

    ( v_e3b, v_m3, v_uid,
      'app',
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
      'Flat roof deck laid — 18 mm OSB/3 on joists at 400 mm centres, falls formed at 1:80',
      '{
        "work_type":             "roofing",
        "trade_category":        "main_contractor",
        "location_in_building":  "roof",
        "completion_stage":      "shell",
        "condition_flag":        "pass",
        "building_element":      "roof",
        "milestone_match":       true,
        "ai_comment":            "Roof deck OSB/3 correctly fixed with H-clip joints staggered. Joist spacing at 400 mm centres verified by measurement. Falls formed minimum 1:80 toward outlet. Deck dry and ready for waterproofing membrane application."
      }',
      now() - interval '51 days',
      'satisfactory', 3, false, true, 2,
      51.4985, -0.1925 ),

    ( v_e3c, v_m3, v_uid,
      'whatsapp',
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
      'EPDM single-ply membrane fully bonded, upstands to parapet 150 mm min, outlet clear',
      '{
        "work_type":             "roofing",
        "trade_category":        "roofer",
        "location_in_building":  "roof",
        "completion_stage":      "shell",
        "condition_flag":        "pass",
        "building_element":      "roof",
        "milestone_match":       true,
        "ai_comment":            "EPDM single-ply fully adhered — no bubbling, blistering or lifting visible at perimeter or field. Upstand correctly bonded to parapet with clamping bar visible. Outlet free of debris. Flashings lapped and dressed. Roof complete and watertight."
      }',
      now() - interval '47 days',
      'satisfactory', 3, false, true, 2,
      51.4984, -0.1921 ),


  -- ── M4: First fix elec & plumbing — 2 items, in_review ───────

    ( v_e4a, v_m4, v_uid,
      'app',
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
      'First fix plumbing rough-in — copper manifold visible, hot and cold runs to kitchen and WC clipped at 500 mm',
      '{
        "work_type":             "plumbing",
        "trade_category":        "plumber",
        "location_in_building":  "ground_floor",
        "completion_stage":      "first_fix",
        "condition_flag":        "pass",
        "building_element":      "services",
        "milestone_match":       true,
        "ai_comment":            "First fix plumbing rough-in — copper manifold visible with isolation valves to each circuit. Hot and cold supply runs clipped at correct centres, no unsupported spans. Soil and waste pipes at correct fall. Pressure test to be carried out before boarding."
      }',
      now() - interval '18 days',
      NULL, 1, false, true, 1,
      51.4985, -0.1922 ),

    ( v_e4b, v_m4, v_uid,
      'app',
      'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&q=80',
      'Cable routes complete through joists — consumer unit position marked in utility cupboard, earth bonding in place',
      '{
        "work_type":             "electrical",
        "trade_category":        "electrician",
        "location_in_building":  "ground_floor",
        "completion_stage":      "first_fix",
        "condition_flag":        "concern",
        "building_element":      "services",
        "milestone_match":       true,
        "ai_comment":            "Cable routes complete through joists and studwork to all first fix positions. Consumer unit position confirmed in utility cupboard. Minor concern: cable route passes within 50 mm of soil pipe stack — recommend additional clipping before plasterboard goes on to avoid any abrasion risk."
      }',
      now() - interval '15 days',
      NULL, 1, false, true, 1,
      51.4986, -0.1923 )

  ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════
  -- 6. Payment certificates
  --    M1: authorized (payment released)
  --    M2: authorized (payment released)
  --    M3: awaiting client authorization
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO public.payment_certificates (
    id, milestone_id, amount,
    generated_at, payment_status,
    released_at, released_by
  ) VALUES
    ( v_cert1, v_m1, 8000,
      now() - interval '77 days', 'authorized',
      now() - interval '70 days', v_uid ),

    ( v_cert2, v_m2, 15000,
      now() - interval '59 days', 'authorized',
      now() - interval '52 days', v_uid ),

    ( v_cert3, v_m3, 22000,
      now() - interval '41 days', 'awaiting_client_authorization',
      NULL, NULL )

  ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════
  -- 7. Activity log (project_changes)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO public.project_changes (
    id, project_id,
    entity_type, entity_id, entity_name,
    change_type,
    changed_by, changed_by_name,
    old_value, new_value,
    created_at
  ) VALUES

    ( v_chg01, v_pid, 'project',   v_pid, '42 Pembroke Road — Rear Extension',
      'created',   v_uid, 'Sophie M.',
      NULL, NULL,
      now() - interval '90 days' ),

    ( v_chg02, v_pid, 'member',    v_mbr_con, 'Dan Hargreaves',
      'created',   v_uid, 'Sophie M.',
      NULL, '{"role":"contractor"}',
      now() - interval '88 days' ),

    ( v_chg03, v_pid, 'member',    v_mbr_trade, 'Yusuf Okafor',
      'created',   v_uid, 'Sophie M.',
      NULL, '{"role":"trade"}',
      now() - interval '80 days' ),

    ( v_chg04, v_pid, 'evidence',  v_m1, 'Site setup & demolition',
      'evidence_submitted', v_uid, 'Dan Hargreaves',
      NULL, '{"photo_count":3}',
      now() - interval '84 days' ),

    ( v_chg05, v_pid, 'milestone', v_m1, 'Site setup & demolition',
      'milestone_status_change', v_uid, 'Dan Hargreaves',
      '{"status":"in_progress"}', '{"status":"in_review"}',
      now() - interval '84 days' ),

    ( v_chg06, v_pid, 'milestone', v_m1, 'Site setup & demolition',
      'approved',  v_uid, 'Sophie M.',
      '{"status":"in_review"}', '{"status":"complete","quality_assessment":"satisfactory"}',
      now() - interval '78 days' ),

    ( v_chg07, v_pid, 'payment',   v_m1, 'Site setup & demolition',
      'authorized', v_uid, 'Claire Ashworth',
      NULL, '{"amount":8000}',
      now() - interval '70 days' ),

    ( v_chg08, v_pid, 'evidence',  v_m2, 'Foundations & groundworks',
      'evidence_submitted', v_uid, 'Dan Hargreaves',
      NULL, '{"photo_count":3}',
      now() - interval '66 days' ),

    ( v_chg09, v_pid, 'milestone', v_m2, 'Foundations & groundworks',
      'approved',  v_uid, 'Sophie M.',
      '{"status":"in_review"}', '{"status":"complete","quality_assessment":"satisfactory"}',
      now() - interval '60 days' ),

    ( v_chg10, v_pid, 'payment',   v_m2, 'Foundations & groundworks',
      'authorized', v_uid, 'Claire Ashworth',
      NULL, '{"amount":15000}',
      now() - interval '52 days' ),

    ( v_chg11, v_pid, 'evidence',  v_m3, 'Structural frame & flat roof',
      'evidence_submitted', v_uid, 'Dan Hargreaves',
      NULL, '{"photo_count":3}',
      now() - interval '47 days' ),

    ( v_chg12, v_pid, 'milestone', v_m3, 'Structural frame & flat roof',
      'approved',  v_uid, 'Sophie M.',
      '{"status":"in_review"}', '{"status":"complete","quality_assessment":"satisfactory"}',
      now() - interval '42 days' ),

    ( v_chg13, v_pid, 'evidence',  v_m4, 'First fix electrical & plumbing',
      'evidence_submitted', v_uid, 'Yusuf Okafor',
      NULL, '{"photo_count":2}',
      now() - interval '15 days' )

  ON CONFLICT (id) DO NOTHING;

END $$;

COMMIT;

-- ══════════════════════════════════════════════════════════════
-- Summary
-- ══════════════════════════════════════════════════════════════
-- Project:  42 Pembroke Road — Rear Extension  (code: PEM42-RE)
-- Demo PM:  demo@cemento.io / DemoCemento2026!
-- Budget:   £92,000  (M1=£8k M2=£15k M3=£22k M4=£11k
--                     M5=£9k  M6=£12k M7=£8k  M8=£7k)
-- Status:   M1-M3 complete + paid, M4 in_review (2 evidence items),
--           M5-M8 pending
-- Released: £23k authorized (M1+M2), £22k awaiting auth (M3)
-- ══════════════════════════════════════════════════════════════
