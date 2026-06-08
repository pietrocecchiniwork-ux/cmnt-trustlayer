
-- Add more work packages, tasks, and milestone links so recommendations appear for common milestone names.

INSERT INTO public.work_packages (work_package_key, label, description) VALUES
  ('site_setup_demolition', 'Site set-up & demolition', 'Hoardings, welfare, soft strip, structural demolition'),
  ('first_fix_mep',         'First fix electrical & plumbing', 'Carcass wiring, pipework, drainage prior to plaster'),
  ('plastering_drylining',  'Plastering & drylining',  'Boarding, scrimming, skim coat, drying'),
  ('decoration_finishing',  'Decoration & finishing',  'Mist coat, top coats, snagging, touch-ups'),
  ('final_handover',        'Final inspection & handover', 'Building control, O&M manuals, keys, snagging sign-off'),
  ('foundations_groundwork','Foundations & groundwork','Excavation, formwork, rebar, concrete pours'),
  ('structural_frame_roof', 'Structural frame & roof', 'Frame erection, roof structure, weathertight envelope')
ON CONFLICT (work_package_key) DO NOTHING;

-- Site setup & demolition tasks
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('site_setup_demolition','Erect hoarding & site signage','M','Photo of hoarding, site notice board',false,1),
  ('site_setup_demolition','Set up welfare facilities (WC, drying room)','M','Photo of welfare unit',false,2),
  ('site_setup_demolition','Asbestos refurbishment & demolition survey','M','PDF of R&D survey report',false,3),
  ('site_setup_demolition','Disconnect services (gas, water, electrics)','M','Service disconnection certificates',true,4),
  ('site_setup_demolition','Soft strip internal finishes','BP','Before/after photos',false,5),
  ('site_setup_demolition','Structural demolition with temporary works','C','Temp works design, daily inspection record',false,6),
  ('site_setup_demolition','Skip/waste transfer notes','M','Waste transfer note PDFs',false,7)
ON CONFLICT DO NOTHING;

-- First fix MEP tasks
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('first_fix_mep','Carcass wiring to all rooms','C','Wiring photos before close-up',true,1),
  ('first_fix_mep','Hot/cold water pipework runs','C','Pressure test certificate',true,2),
  ('first_fix_mep','Waste & soil pipework','C','Photos of falls & connections',true,3),
  ('first_fix_mep','Notching & drilling within permissible zones','BP','Photo evidence of joist notches',true,4),
  ('first_fix_mep','First fix sign-off by PM before plaster','M','PM sign-off note',false,5)
ON CONFLICT DO NOTHING;

-- Plastering tasks
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('plastering_drylining','Board ceilings & walls','BP','Photos of boarded rooms',false,1),
  ('plastering_drylining','Tape & joint / scrim','BP','Photos of jointing',false,2),
  ('plastering_drylining','Apply skim coat','BP','Photos of finished skim',false,3),
  ('plastering_drylining','Allow drying time before decoration','M','Date-stamped photo / moisture reading',false,4)
ON CONFLICT DO NOTHING;

-- Decoration tasks
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('decoration_finishing','Apply mist coat to new plaster','BP','Photo of mist coat',false,1),
  ('decoration_finishing','Two top coats to walls & ceilings','C','Photos per room',false,2),
  ('decoration_finishing','Gloss/satinwood to woodwork','C','Photos of finished joinery',false,3),
  ('decoration_finishing','Snagging walk-through & touch-ups','M','Snag list PDF, signed',false,4)
ON CONFLICT DO NOTHING;

-- Final handover tasks
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('final_handover','Building control final sign-off','M','BC completion certificate',false,1),
  ('final_handover','Electrical installation certificate (EICR)','M','EICR PDF',false,2),
  ('final_handover','Gas safe commissioning certificate','M','Gas Safe certificate',false,3),
  ('final_handover','O&M manual & warranties pack','C','O&M PDF',false,4),
  ('final_handover','Handover meeting & keys','M','Signed handover note, photo of keys',false,5)
ON CONFLICT DO NOTHING;

-- Foundations
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('foundations_groundwork','Excavation to formation level','C','Photos of excavation, depth',true,1),
  ('foundations_groundwork','Building control inspection of trenches','M','BC inspection record',true,2),
  ('foundations_groundwork','Rebar/reinforcement in place','C','Photos before pour',true,3),
  ('foundations_groundwork','Concrete pour & cube tests','M','Delivery ticket, cube test results',true,4)
ON CONFLICT DO NOTHING;

-- Structural frame
INSERT INTO public.work_package_tasks (work_package_key, task, task_type, expected_evidence, concealment_flag, task_order) VALUES
  ('structural_frame_roof','Steel/timber frame erection','C','Photos of frame in place',false,1),
  ('structural_frame_roof','Structural engineer sign-off','M','SE inspection report',false,2),
  ('structural_frame_roof','Roof structure & breather membrane','C','Photos of roof build-up',true,3),
  ('structural_frame_roof','Weathertight envelope achieved','M','Photo of completed envelope',false,4)
ON CONFLICT DO NOTHING;

-- Fix existing link: rename "second_fix" -> "second_fix_and_joinery" so it matches real milestone names
UPDATE public.milestone_work_packages SET milestone_key = 'second_fix_and_joinery'
  WHERE contract_type = 'JCT_MW' AND milestone_key = 'second_fix';

-- Add milestone -> work package links for the common milestone slugs in use
INSERT INTO public.milestone_work_packages (contract_type, milestone_key, work_package_key, sort_order) VALUES
  ('JCT_MW','site_setup_and_demolition','site_setup_demolition',1),
  ('JCT_MW','mobilisation_site_set_up_demolition_of_rear_addition','site_setup_demolition',1),
  ('JCT_MW','foundations_and_groundwork','foundations_groundwork',1),
  ('JCT_MW','structural_frame_and_roof','structural_frame_roof',1),
  ('JCT_MW','first_fix_electrical_and_plumbing','first_fix_mep',1),
  ('JCT_MW','plastering_and_drylining','plastering_drylining',1),
  ('JCT_MW','second_fix_and_joinery','kitchen_install',2),
  ('JCT_MW','second_fix_and_joinery','bathroom_fitout',3),
  ('JCT_MW','decoration_and_finishing','decoration_finishing',1),
  ('JCT_MW','final_inspection_and_handover','final_handover',1)
ON CONFLICT DO NOTHING;
