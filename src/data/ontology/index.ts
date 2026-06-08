/**
 * Cemento LCM — UK Construction Ontology v1.0
 *
 * Permanent, app-wide AI knowledge baked into Cemento. Sources:
 *   - "Cemento LCM — UK Construction Ontology: Complete Taxonomy v1.0"
 *   - "Cemento LCM Ontology — Relational & Quantitative Deepening (Master Prompt 2)"
 *
 * Every value comes from UK primary sources: Building Regulations Approved Documents,
 * BS 8000 workmanship series, BS 7671:2018, NHBC Standards 2024, JCT SBC/Q 2016, Eurocodes.
 *
 * Used in two ways:
 *   1. Compact taxonomy (entity IDs + names) is always-on context for every AI call.
 *   2. Detailed chunks (compliance values, defect signatures) are embedded into
 *      knowledge_chunks (project_id = NULL) and retrieved per query.
 */

export const ONTOLOGY_VERSION = "1.0";

export type Severity = "minor" | "significant" | "critical" | "dangerous";
export type ValueType =
  | "regulatory"
  | "nhbc"
  | "bs_workmanship"
  | "bs_standard"
  | "industry_guidance"
  | "manufacturer";

export interface Phase {
  id: string;
  name: string;
  riba_stage: string;
  project_types: string[];
  duration_weeks: string;
}

export interface Trade {
  id: string;
  name: string;
  citb_classification: string;
  key_standards: string[];
}

export interface Material {
  id: string;
  name: string;
  key_standard: string;
  installed_by: string[];
}

export interface Standard {
  id: string;
  reference: string;
  title: string;
  primary_trades: string[];
}

export interface Defect {
  id: string;
  name: string;
  severity: Severity;
  phase: string;
  trade: string;
  standards_violated: string[];
  visual_description?: string;
}

export interface EvidenceType {
  id: string;
  name: string;
  can_trigger_payment: boolean;
  legal_weight: string;
}

export interface ComplianceValue {
  entity: string;
  parameter: string;
  value: string;
  unit: string;
  condition: string;
  value_type: ValueType;
  source: string;
}

export interface SequenceRule {
  predecessor: string;
  relationship: string;
  successor: string;
  basis: string;
  irreversible: boolean;
  source: string;
}

// ----------------------------------------------------------------------------
// PHASES — 33 nodes
// ----------------------------------------------------------------------------
export const PHASES: Phase[] = [
  { id: "PH-001", name: "Pre-Construction: Site Setup and Mobilisation", riba_stage: "4–5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-002", name: "Demolition and Strip Out", riba_stage: "5", project_types: ["refurb", "fit_out", "extension"], duration_weeks: "1–4" },
  { id: "PH-003", name: "Groundworks: Bulk Excavation", riba_stage: "5", project_types: ["new_build", "extension"], duration_weeks: "1–3" },
  { id: "PH-004", name: "Groundworks: Drainage Installation", riba_stage: "5", project_types: ["new_build", "extension", "fit_out"], duration_weeks: "1–2" },
  { id: "PH-005", name: "Foundations", riba_stage: "5", project_types: ["new_build", "extension"], duration_weeks: "1–3" },
  { id: "PH-006", name: "Substructure: Ground Floor Slab and DPC", riba_stage: "5", project_types: ["new_build", "extension"], duration_weeks: "1–2" },
  { id: "PH-007", name: "Superstructure: External and Internal Masonry / Frame", riba_stage: "5", project_types: ["new_build", "extension"], duration_weeks: "4–12" },
  { id: "PH-008", name: "Roof Structure", riba_stage: "5", project_types: ["new_build", "extension", "loft"], duration_weeks: "1–3" },
  { id: "PH-009", name: "Roofing: Weatherproofing (Pitched)", riba_stage: "5", project_types: ["new_build", "extension", "loft"], duration_weeks: "1–3" },
  { id: "PH-010", name: "Roofing: Weatherproofing (Flat)", riba_stage: "5", project_types: ["new_build", "extension", "fit_out"], duration_weeks: "1–2" },
  { id: "PH-011", name: "External Windows and Doors", riba_stage: "5", project_types: ["new_build", "refurb", "extension", "loft"], duration_weeks: "1–2" },
  { id: "PH-012", name: "First Fix Carpentry", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-013", name: "First Fix Plumbing", riba_stage: "5", project_types: ["all"], duration_weeks: "1–3" },
  { id: "PH-014", name: "First Fix Electrical", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-015", name: "Insulation Installation", riba_stage: "5", project_types: ["new_build", "refurb", "extension", "loft"], duration_weeks: "1–2" },
  { id: "PH-016", name: "Fire Stopping and Compartmentation", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-017", name: "Plastering and Screeding", riba_stage: "5", project_types: ["all"], duration_weeks: "2–4" },
  { id: "PH-018", name: "Second Fix Carpentry", riba_stage: "5", project_types: ["all"], duration_weeks: "1–3" },
  { id: "PH-019", name: "Second Fix Plumbing", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-020", name: "Second Fix Electrical", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-021", name: "Tiling", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-022", name: "Flooring", riba_stage: "5", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-023", name: "Decoration", riba_stage: "5", project_types: ["all"], duration_weeks: "1–3" },
  { id: "PH-024", name: "Kitchen and Bathroom Fitting", riba_stage: "5", project_types: ["new_build", "refurb", "extension"], duration_weeks: "1–2" },
  { id: "PH-025", name: "HVAC and Mechanical Ventilation", riba_stage: "5", project_types: ["new_build", "extension", "fit_out"], duration_weeks: "1–3" },
  { id: "PH-026", name: "External Works and Landscaping", riba_stage: "5–6", project_types: ["new_build", "extension"], duration_weeks: "1–4" },
  { id: "PH-027", name: "Testing and Commissioning", riba_stage: "5–6", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-028", name: "Snagging", riba_stage: "6", project_types: ["all"], duration_weeks: "1–2" },
  { id: "PH-029", name: "Handover and Practical Completion", riba_stage: "6", project_types: ["all"], duration_weeks: "1" },
  { id: "PH-030", name: "Loft Conversion: Roof Strip and Temporary Support", riba_stage: "5", project_types: ["loft"], duration_weeks: "1" },
  { id: "PH-031", name: "Loft Conversion: Steel Beam Installation", riba_stage: "5", project_types: ["loft"], duration_weeks: "1" },
  { id: "PH-032", name: "Commercial Fit-Out: Partition and Ceiling Systems", riba_stage: "5", project_types: ["commercial_fit_out"], duration_weeks: "2–6" },
  { id: "PH-033", name: "Residential Refurbishment: Structural Alterations", riba_stage: "5", project_types: ["refurb"], duration_weeks: "1–4" },
];

// ----------------------------------------------------------------------------
// TRADES — 18 nodes
// ----------------------------------------------------------------------------
export const TRADES: Trade[] = [
  { id: "TR-001", name: "Main Contractor / Site Manager", citb_classification: "Construction site management", key_standards: ["CDM 2015", "BS 8000-0"] },
  { id: "TR-002", name: "Groundworker", citb_classification: "Sub-structure work occupations", key_standards: ["BS 8000-1", "Approved Document H"] },
  { id: "TR-003", name: "Bricklayer", citb_classification: "Bricklaying occupations", key_standards: ["BS 8000-3:2001", "BS EN 845-1"] },
  { id: "TR-004", name: "Structural Engineer", citb_classification: "Built environment design and consultancy", key_standards: ["Eurocodes EN 1990–1995"] },
  { id: "TR-005", name: "Carpenter / Joiner", citb_classification: "Super-structure work (carpentry)", key_standards: ["BS 8000-5:1990", "BS EN 338"] },
  { id: "TR-006", name: "Roofer", citb_classification: "Roofing occupations", key_standards: ["BS 5534:2014+A2:2018", "BS 6229:2025"] },
  { id: "TR-007", name: "Plumber", citb_classification: "Specialist installation (plumbing)", key_standards: ["Water Fittings Regs 1999", "BS EN 806"] },
  { id: "TR-008", name: "Electrician", citb_classification: "Specialist installation (electrotechnical)", key_standards: ["BS 7671:2018 Amd 2", "Approved Document P"] },
  { id: "TR-009", name: "Plasterer", citb_classification: "Super-structure work (plastering)", key_standards: ["BS 8000-10", "BS 8000-8"] },
  { id: "TR-010", name: "Tiler", citb_classification: "Super-structure work (tiling)", key_standards: ["BS 8000-11:2011", "BS 5385"] },
  { id: "TR-011", name: "Decorator", citb_classification: "Super-structure work (painting and decorating)", key_standards: ["BS 8000-12:1989"] },
  { id: "TR-012", name: "Glazier", citb_classification: "Specialist installation (glazing)", key_standards: ["BS 8000-7:1990", "BS EN 12150"] },
  { id: "TR-013", name: "Insulation Installer", citb_classification: "Thermal insulation", key_standards: ["Approved Document L", "BS 5250:2021"] },
  { id: "TR-014", name: "Flooring Installer", citb_classification: "Specialist installation (floor covering)", key_standards: ["BS 8201", "BS 8000-9"] },
  { id: "TR-015", name: "Kitchen Fitter", citb_classification: "Multi-trade repair and refurbishment", key_standards: ["BS 8000-5", "Gas Safety Regs 1998"] },
  { id: "TR-016", name: "Landscape Gardener", citb_classification: "External works", key_standards: ["NHBC Standards Part 10"] },
  { id: "TR-017", name: "HVAC Engineer", citb_classification: "Specialist installation (HVAC)", key_standards: ["Approved Document F", "BS EN 16798-7"] },
  { id: "TR-018", name: "Fire Protection Installer", citb_classification: "Specialist installation (passive fire)", key_standards: ["Approved Document B", "BS 9991:2024"] },
];

// ----------------------------------------------------------------------------
// MATERIALS — 23 nodes
// ----------------------------------------------------------------------------
export const MATERIALS: Material[] = [
  { id: "MAT-001", name: "Concrete — Grade C20/25", key_standard: "BS EN 206, BS 8500-1", installed_by: ["TR-002"] },
  { id: "MAT-002", name: "Concrete — Grade C25/30", key_standard: "BS EN 206, BS 8500-1", installed_by: ["TR-002"] },
  { id: "MAT-003", name: "Concrete — Grade C30/37", key_standard: "BS EN 206, BS 8500-1", installed_by: ["TR-002", "TR-004"] },
  { id: "MAT-004", name: "Reinforcement Bar B500B", key_standard: "BS 4449:2005+A3:2016, BS 8666", installed_by: ["TR-002"] },
  { id: "MAT-005", name: "Structural Timber C16", key_standard: "BS EN 338:2016", installed_by: ["TR-005"] },
  { id: "MAT-006", name: "Structural Timber C24", key_standard: "BS EN 338:2016", installed_by: ["TR-005"] },
  { id: "MAT-007", name: "Engineered Timber — Glulam / LVL", key_standard: "BS EN 14080, BS EN 14374", installed_by: ["TR-005"] },
  { id: "MAT-008", name: "Structural Steel UB S275/S355", key_standard: "BS EN 10025-2:2019, Eurocode 3", installed_by: ["TR-004"] },
  { id: "MAT-009", name: "Clay Facing Brick", key_standard: "BS EN 771-1:2011+A1:2015", installed_by: ["TR-003"] },
  { id: "MAT-010", name: "Aircrete Block (AAC)", key_standard: "BS EN 771-4:2011+A1:2015", installed_by: ["TR-003"] },
  { id: "MAT-011", name: "Concrete Roof Tile", key_standard: "BS EN 490:2011+A1:2017, BS 5534", installed_by: ["TR-006"] },
  { id: "MAT-012", name: "Breathable Roofing Underlay (LR)", key_standard: "BS 5534, BS EN 13859-1", installed_by: ["TR-006"] },
  { id: "MAT-013", name: "PIR Insulation Board", key_standard: "BS EN 13165:2012+A2:2016", installed_by: ["TR-013"] },
  { id: "MAT-014", name: "Mineral Wool Insulation", key_standard: "BS EN 13162:2012+A1:2015", installed_by: ["TR-013"] },
  { id: "MAT-015", name: "Plasterboard (Standard/MR/FR)", key_standard: "BS EN 520:2004+A1:2009", installed_by: ["TR-009"] },
  { id: "MAT-016", name: "Sand-Cement Floor Screed", key_standard: "BS 8204-1:2017, BS EN 13813", installed_by: ["TR-009"] },
  { id: "MAT-017", name: "DPC Strip (Polythene)", key_standard: "BS 6515:1984", installed_by: ["TR-003", "TR-002"] },
  { id: "MAT-018", name: "DPM (Damp Proof Membrane)", key_standard: "BS 8102:2022", installed_by: ["TR-002"] },
  { id: "MAT-019", name: "Copper Pipe (BS EN 1057 Type X/Y)", key_standard: "BS EN 1057:2006+A1:2010", installed_by: ["TR-007"] },
  { id: "MAT-020", name: "Plastic Pipework (CPVC/PB/uPVC)", key_standard: "BS EN 1452, BS EN ISO 15874", installed_by: ["TR-007"] },
  { id: "MAT-021", name: "Electrical Cable — Twin and Earth (6242Y)", key_standard: "BS 6004:2012, BS 7671:2018", installed_by: ["TR-008"] },
  { id: "MAT-022", name: "Render System (Thin Coat / K Rend)", key_standard: "BS EN 998-1:2016, BBA certificate", installed_by: ["TR-009"] },
  { id: "MAT-023", name: "Cavity Wall Ties", key_standard: "BS EN 845-1:2013+A1:2016", installed_by: ["TR-003"] },
];

// ----------------------------------------------------------------------------
// STANDARDS — 15 nodes
// ----------------------------------------------------------------------------
export const STANDARDS: Standard[] = [
  { id: "STD-001", reference: "Approved Document A (2004, 2010, 2013 amendments)", title: "Structure", primary_trades: ["TR-004", "TR-002", "TR-003", "TR-005"] },
  { id: "STD-002", reference: "Approved Document B Vol 1 (2019, 2020, 2022, 2025 amendments)", title: "Fire Safety: Dwellings", primary_trades: ["TR-018", "TR-005"] },
  { id: "STD-003", reference: "Approved Document C (2004, 2010 amendments)", title: "Site Preparation and Resistance to Moisture", primary_trades: ["TR-002", "TR-003"] },
  { id: "STD-004", reference: "Approved Document E (2003, 2004 amendment)", title: "Resistance to the Passage of Sound", primary_trades: ["TR-009", "TR-005"] },
  { id: "STD-005", reference: "Approved Document F Vol 1 (2022)", title: "Ventilation: Dwellings", primary_trades: ["TR-017", "TR-008"] },
  { id: "STD-006", reference: "Approved Document L Vol 1 (2021)", title: "Conservation of Fuel and Power: Dwellings", primary_trades: ["TR-013", "TR-017", "TR-012"] },
  { id: "STD-007", reference: "Approved Document P (2013)", title: "Electrical Safety: Dwellings", primary_trades: ["TR-008"] },
  { id: "STD-008", reference: "BS 7671:2018 Amendment 2 (2022)", title: "IET 18th Edition Wiring Regulations", primary_trades: ["TR-008"] },
  { id: "STD-009", reference: "BS 8000 series (Parts 0–16)", title: "Workmanship on Building Sites", primary_trades: ["TR-001"] },
  { id: "STD-010", reference: "BS 5250:2021", title: "Management of Moisture in Buildings", primary_trades: ["TR-013", "TR-006", "TR-009"] },
  { id: "STD-011", reference: "BS 6229:2025", title: "Flat Roofs — Flexible Waterproof Coverings", primary_trades: ["TR-006"] },
  { id: "STD-012", reference: "BS 8102:2022", title: "Protection of Below Ground Structures from Water Ingress", primary_trades: ["TR-002", "TR-004"] },
  { id: "STD-013", reference: "NHBC Standards 2024", title: "Technical Requirements for New Homes (Parts 3–10)", primary_trades: ["TR-001"] },
  { id: "STD-014", reference: "Approved Document H (2015)", title: "Drainage and Waste Disposal", primary_trades: ["TR-002", "TR-007"] },
  { id: "STD-015", reference: "Gas Safety (Installation and Use) Regulations 1998", title: "Gas Safety", primary_trades: ["TR-007", "TR-017"] },
];

// ----------------------------------------------------------------------------
// DEFECTS — 18 nodes
// ----------------------------------------------------------------------------
export const DEFECTS: Defect[] = [
  { id: "DEF-001", name: "Thermal Bridging / Cold Bridging", severity: "significant", phase: "PH-015", trade: "TR-013", standards_violated: ["STD-006", "STD-010"], visual_description: "Cold spots visible on thermal imaging at wall-floor or wall-roof junctions, around window reveals, or at intermediate floor edges. Mould or condensation patterns may follow the same lines on interior finishes." },
  { id: "DEF-002", name: "Inadequate Fire Stopping at Penetrations", severity: "critical", phase: "PH-016", trade: "TR-018", standards_violated: ["STD-002"], visual_description: "Visible gap or open penetration where plastic waste or supply pipe passes through a fire-rated floor or plasterboard ceiling. No intumescent collar visible around pipe penetration. Mineral wool stuffed loosely around pipe is NOT an approved fire stopping solution." },
  { id: "DEF-003", name: "Incorrect Pipe Fall Gradient (Underground)", severity: "significant", phase: "PH-004", trade: "TR-002", standards_violated: ["STD-014"], visual_description: "Spirit level or laser shows back-fall during installation, or water pooling visible in open trench. Post-construction CCTV shows standing water on pipe invert." },
  { id: "DEF-004", name: "Unsupported Pipe Runs", severity: "minor", phase: "PH-013", trade: "TR-007", standards_violated: ["BS EN 806"] },
  { id: "DEF-005", name: "Moisture Ingress Through Roof", severity: "significant", phase: "PH-009", trade: "TR-006", standards_violated: ["STD-003", "BS 5534"] },
  { id: "DEF-006", name: "Inadequate or Bridged DPC", severity: "significant", phase: "PH-006", trade: "TR-003", standards_violated: ["STD-003"], visual_description: "Ground, soil, paving or render raised above the visible DPC level (DPC less than 150mm above finished external ground). Salt crystallisation (efflorescence) on brickwork at low level. Damp mapping on internal wall at low level." },
  { id: "DEF-007", name: "Insufficient Insulation Thickness", severity: "significant", phase: "PH-015", trade: "TR-013", standards_violated: ["STD-006"] },
  { id: "DEF-008", name: "Incorrect Cable Installation", severity: "critical", phase: "PH-014", trade: "TR-008", standards_violated: ["STD-008"], visual_description: "Cable runs outside safe zones (within 150mm of ceiling/wall junctions or vertically above outlets). Cables stapled too tight, sheath nicks visible, or cables run through metal stud holes without grommets." },
  { id: "DEF-009", name: "Missing or Failed Cavity Wall Ties", severity: "dangerous", phase: "PH-007", trade: "TR-003", standards_violated: ["STD-001", "BS EN 845-1"], visual_description: "Horizontal cracks in outer brickwork leaf running along bed joints at regular vertical intervals (every 8–15 courses). Bowing of outer leaf visible from street level. Often first noticed on gable end where ties are most widely spaced." },
  { id: "DEF-010", name: "Poor Plastering Workmanship", severity: "minor", phase: "PH-017", trade: "TR-009", standards_violated: ["BS 8000-10", "NHBC Ch 9.1"] },
  { id: "DEF-011", name: "Tile Delamination", severity: "significant", phase: "PH-021", trade: "TR-010", standards_violated: ["BS 8000-11", "BS EN 12004"] },
  { id: "DEF-012", name: "Flat Roof Ponding", severity: "significant", phase: "PH-010", trade: "TR-006", standards_violated: ["STD-011"], visual_description: "Standing water visible on membrane surface after rain, pooling against upstands or in centre of bay. Tide-mark rings on dry membrane. EPDM may show stretching or wrinkling at low points." },
  { id: "DEF-013", name: "Inadequate Drainage Falls (Internal Waste)", severity: "significant", phase: "PH-013", trade: "TR-007", standards_violated: ["STD-014", "BS EN 12056"] },
  { id: "DEF-014", name: "Substandard Concrete — Honeycombing", severity: "critical", phase: "PH-005", trade: "TR-002", standards_violated: ["BS EN 206", "BS 8000-2.2"] },
  { id: "DEF-015", name: "Missing Cavity Wall Ties During Construction", severity: "dangerous", phase: "PH-007", trade: "TR-003", standards_violated: ["STD-001", "BS EN 845-1"] },
  { id: "DEF-016", name: "Inadequate Mechanical Extract Ventilation", severity: "significant", phase: "PH-025", trade: "TR-017", standards_violated: ["STD-005"] },
  { id: "DEF-017", name: "Timber Decay Risk — Wet Rot / Dry Rot", severity: "significant", phase: "PH-009", trade: "TR-006", standards_violated: ["BS 8000-6", "NHBC Ch 7.2"] },
  { id: "DEF-018", name: "Joist Notching Outside Permitted Zone", severity: "significant", phase: "PH-012", trade: "TR-005", standards_violated: ["STD-001"], visual_description: "Notch or hole positioned outside permitted zone (too close to support or at mid-span); notch depth exceeding 0.125× joist depth; notch in bottom of joist (not permitted). Correct: notch in top only, within 0.07–0.25 span from support, depth ≤0.125× depth." },
];

// ----------------------------------------------------------------------------
// EVIDENCE TYPES — 17 nodes
// ----------------------------------------------------------------------------
export const EVIDENCE_TYPES: EvidenceType[] = [
  { id: "EV-001", name: "Progress Photograph", can_trigger_payment: true, legal_weight: "Supporting (low–medium)" },
  { id: "EV-002", name: "Architect's Instruction (AI)", can_trigger_payment: false, legal_weight: "High (JCT Clause 3.10)" },
  { id: "EV-003", name: "Variation Order (VO)", can_trigger_payment: true, legal_weight: "High" },
  { id: "EV-004", name: "Site Inspection Certificate", can_trigger_payment: true, legal_weight: "Medium–High" },
  { id: "EV-005", name: "Building Control Inspection Notice", can_trigger_payment: true, legal_weight: "High (statutory)" },
  { id: "EV-006", name: "Structural Engineer Sign-Off", can_trigger_payment: true, legal_weight: "High (professional)" },
  { id: "EV-007", name: "Gas Safe Certificate", can_trigger_payment: true, legal_weight: "High (legal requirement)" },
  { id: "EV-008", name: "Electrical Installation Certificate (EIC)", can_trigger_payment: true, legal_weight: "High (legal requirement)" },
  { id: "EV-009", name: "Plumbing Hydraulic Pressure Test Certificate", can_trigger_payment: true, legal_weight: "Medium" },
  { id: "EV-010", name: "Air Tightness Test Certificate", can_trigger_payment: true, legal_weight: "High (Building Regs required)" },
  { id: "EV-011", name: "Pre-Completion Sound Test Certificate (Part E)", can_trigger_payment: false, legal_weight: "High (Building Regs required)" },
  { id: "EV-012", name: "Energy Performance Certificate (EPC)", can_trigger_payment: false, legal_weight: "Medium (legal requirement)" },
  { id: "EV-013", name: "Snagging List", can_trigger_payment: false, legal_weight: "Medium" },
  { id: "EV-014", name: "Practical Completion Certificate", can_trigger_payment: true, legal_weight: "Very High (JCT milestone)" },
  { id: "EV-015", name: "Building Control Completion Certificate", can_trigger_payment: true, legal_weight: "Very High (statutory)" },
  { id: "EV-016", name: "Defects Liability Certificate", can_trigger_payment: true, legal_weight: "High (JCT Clause 2.39)" },
  { id: "EV-017", name: "Retention Release Notice", can_trigger_payment: true, legal_weight: "High (HGCRA 1996)" },
];

// ----------------------------------------------------------------------------
// COMPLIANCE VALUES — Quantitative thresholds with primary-source citations
// ----------------------------------------------------------------------------
export const COMPLIANCE_VALUES: ComplianceValue[] = [
  // Substructure / DPC / Drainage
  { entity: "PH-005", parameter: "Foundation depth minimum — general (non-clay)", value: "≥450", unit: "mm", condition: "Strip foundations; non-shrinkable subsoil; no trees", value_type: "regulatory", source: "AD Part A, Table 12" },
  { entity: "PH-005", parameter: "Foundation depth — shrinkable clay, no trees", value: "≥750", unit: "mm", condition: "Clay soil; no vegetation influence", value_type: "regulatory", source: "AD Part A, Table 12; NHBC Standards 2024 Ch.4.2" },
  { entity: "PH-005", parameter: "Foundation depth — shrinkable clay, trees within H/2", value: "≥900", unit: "mm", condition: "Clay soil; trees within distance = half tree height", value_type: "regulatory", source: "AD Part A, Table 12" },
  { entity: "PH-005", parameter: "Foundation depth — shrinkable clay, trees H/2–H", value: "≥1000", unit: "mm", condition: "Clay soil; trees within distance = tree height", value_type: "regulatory", source: "AD Part A, Table 12" },
  { entity: "PH-005", parameter: "Foundation depth — shrinkable clay, downhill of trees", value: "≥1200", unit: "mm", condition: "Clay soil; downhill or same level as tree", value_type: "regulatory", source: "AD Part A, Table 12" },
  { entity: "MAT-017", parameter: "DPC minimum height above finished external ground level", value: "≥150", unit: "mm", condition: "All new external walls", value_type: "regulatory", source: "AD Part C s.C2; BS 8215:1991" },
  { entity: "MAT-017", parameter: "DPC joint lap minimum", value: "≥100", unit: "mm", condition: "At all joints in DPC", value_type: "regulatory", source: "AD Part C" },
  { entity: "PH-006", parameter: "Cavity extension below lowest DPC level", value: "≥225", unit: "mm", condition: "External cavity walls", value_type: "regulatory", source: "AD Part C" },
  { entity: "PH-004", parameter: "Foul drain min gradient — 100mm pipe, >1 l/s, with WC", value: "1:80", unit: "gradient", condition: "100mm dia foul drain; flow >1 l/s", value_type: "regulatory", source: "AD Part H Table H2; BS EN 12056-2" },
  { entity: "PH-004", parameter: "Foul drain min gradient — 100mm pipe, <1 l/s", value: "1:40", unit: "gradient", condition: "100mm dia foul drain; flow <1 l/s", value_type: "regulatory", source: "AD Part H Table H2" },
  { entity: "PH-004", parameter: "Foul drain min gradient — 150mm pipe", value: "1:150", unit: "gradient", condition: "Requires ≥5 WCs", value_type: "regulatory", source: "AD Part H Table H2" },
  { entity: "PH-004", parameter: "Surface water drainage minimum fall", value: "1:100", unit: "gradient", condition: "10mm per metre", value_type: "regulatory", source: "AD Part H Table 6" },
  { entity: "PH-004", parameter: "Air test pass — pressure drop in 5 min from 100mm WG", value: "≤25", unit: "mm water gauge", condition: "BS EN 1610 Test Level 1", value_type: "bs_standard", source: "BS EN 1610:2015; AD Part H s.2.61" },

  // Masonry / Wall ties
  { entity: "MAT-023", parameter: "Wall tie density (cavity wall, both leaves ≥90mm, standard)", value: "≥2.5", unit: "ties/m²", condition: "Standard exposure", value_type: "nhbc", source: "NHBC Standards 2024 Ch.6.1; BS 8000-3:2001" },
  { entity: "MAT-023", parameter: "Wall tie maximum horizontal spacing (standard)", value: "≤900", unit: "mm", condition: "Standard zone", value_type: "bs_workmanship", source: "BS 8000-3:2001" },
  { entity: "MAT-023", parameter: "Wall tie maximum vertical spacing (standard)", value: "≤450", unit: "mm", condition: "Standard zone", value_type: "bs_workmanship", source: "BS 8000-3:2001; NHBC Standards 2024 Ch.6.1" },
  { entity: "MAT-023", parameter: "Wall tie spacing adjacent to unbonded openings (vertical)", value: "≤300", unit: "mm", condition: "Within 225mm horizontal of unbonded opening, either side", value_type: "nhbc", source: "NHBC Standards 2024 Ch.6.1; BS 8000-3:2001" },
  { entity: "MAT-023", parameter: "Wall tie mortar embedment minimum", value: "≥50", unit: "mm", condition: "Into mortar bed in each leaf", value_type: "bs_workmanship", source: "BS 8000-3:2001; NHBC Standards 2024" },
  { entity: "PH-007", parameter: "Masonry verticality tolerance (plumb) — per storey", value: "±12", unit: "mm", condition: "Per storey height", value_type: "nhbc", source: "NHBC Standards 2024 Ch.9.1; LABC Warranty s.20" },
  { entity: "PH-007", parameter: "Mortar bed joint thickness", value: "8–15", unit: "mm", condition: "Normal 10mm target; tolerance ±3mm", value_type: "bs_workmanship", source: "BS 8000-3:2001" },
  { entity: "PH-007", parameter: "Face flatness under 2m straightedge", value: "±5", unit: "mm", condition: "Max deviation of masonry face in any 2m", value_type: "nhbc", source: "NHBC Standards 2024 Ch.9.1" },

  // Carpentry / Joists
  { entity: "TR-005", parameter: "Joist notch — permitted zone from support", value: "0.07× to 0.25× span", unit: "from each support", condition: "Top of joist only; never both top and bottom", value_type: "bs_standard", source: "Eurocode 5 / BS EN 1995-1-1; LABC guidance" },
  { entity: "TR-005", parameter: "Joist notch maximum depth", value: "0.125× joist depth (max 35mm absolute)", unit: "mm", condition: "Permitted zone only", value_type: "bs_standard", source: "Eurocode 5; LABC" },
  { entity: "TR-005", parameter: "Joist drill hole permitted zone from support", value: "0.25× to 0.40× span", unit: "from each support", condition: "Centreline only", value_type: "bs_standard", source: "Eurocode 5; LABC" },
  { entity: "TR-005", parameter: "Joist drill hole maximum diameter", value: "0.25× joist depth (max 65mm absolute)", unit: "mm", condition: "On centreline", value_type: "bs_standard", source: "Eurocode 5; LABC" },
  { entity: "TR-005", parameter: "Engineered I-joist notching/drilling flanges", value: "Forbidden", unit: "—", condition: "Manufacturer instructions govern web openings", value_type: "manufacturer", source: "Manufacturer's product ETA" },

  // Screeds / Plaster
  { entity: "MAT-016", parameter: "Bonded sand-cement screed minimum thickness", value: "25", unit: "mm", condition: "Bonded to base with bonding agent", value_type: "bs_standard", source: "BS 8204-1:2003+A1:2009" },
  { entity: "MAT-016", parameter: "Unbonded sand-cement screed minimum thickness", value: "50", unit: "mm", condition: "On DPM over concrete base", value_type: "bs_standard", source: "BS 8204-1" },
  { entity: "MAT-016", parameter: "Floating screed on insulation — light load", value: "65", unit: "mm", condition: "On insulation; light load", value_type: "bs_standard", source: "BS 8204-1" },
  { entity: "MAT-016", parameter: "Floating screed on insulation — heavy load", value: "75", unit: "mm", condition: "On insulation; heavy load", value_type: "bs_standard", source: "BS 8204-1" },
  { entity: "MAT-016", parameter: "Curing time — sand-cement screed before light foot traffic", value: "≥7", unit: "days", condition: "Normal temperature; longer in cold", value_type: "bs_workmanship", source: "BS 8204-1 curing guidance" },
  { entity: "TR-009", parameter: "Floor surface regularity SR2 (normal standard)", value: "≤5", unit: "mm gap under 2m straightedge", condition: "Class SR2", value_type: "bs_standard", source: "BS 8204" },

  // Tiling
  { entity: "TR-010", parameter: "Tile adhesive coverage — floor tiles (internal, standard)", value: "≥65%", unit: "contact area", condition: "Internal floor; tiles ≤900cm²", value_type: "bs_standard", source: "BS 5385-3:2014+A1:2018; BS 8000-11:2011" },
  { entity: "TR-010", parameter: "Tile adhesive coverage — wet/external/large format", value: "≥95%", unit: "contact area", condition: "External, wet rooms, tiles >900cm²", value_type: "bs_standard", source: "BS 5385-3; BS 8000-11" },
  { entity: "TR-010", parameter: "Tile adhesive coverage — wall tiles (internal dry)", value: "≥65%", unit: "contact area", condition: "Updated from 50% in BS 5385-1:2018", value_type: "bs_standard", source: "BS 5385-1:2018" },

  // Thermal / Part L
  { entity: "STD-006", parameter: "Air permeability target — new dwellings", value: "≤5.0", unit: "m³/h/m² @ 50 Pa", condition: "Tested to BS EN ISO 9972; as-built SAP", value_type: "regulatory", source: "AD Part L Vol.1 (2021) s.3" },
  { entity: "STD-006", parameter: "Air permeability back-stop maximum — new dwellings", value: "≤10", unit: "m³/h/m² @ 50 Pa", condition: "Absolute limit", value_type: "regulatory", source: "AD Part L Vol.1" },
  { entity: "STD-006", parameter: "Limiting U-value — windows (back-stop, new dwellings)", value: "≤1.6", unit: "W/m²K", condition: "Notional dwelling uses 1.2", value_type: "regulatory", source: "AD Part L Vol.1 (2021) Fig.1" },
  { entity: "STD-006", parameter: "Limiting U-value — rooflights horizontal", value: "≤2.2", unit: "W/m²K", condition: "Back-stop", value_type: "regulatory", source: "AD Part L Vol.1 (2021)" },
  { entity: "STD-006", parameter: "Limiting U-value — replacement windows (existing dwellings)", value: "≤1.4", unit: "W/m²K", condition: "Or WER Band B minimum", value_type: "regulatory", source: "AD Part L Vol.1 (2021)" },

  // Acoustics / Part E
  { entity: "STD-004", parameter: "Min airborne sound insulation — separating walls (new-build dwellings)", value: "DnT,w + Ctr ≥45", unit: "dB", condition: "Purpose-built houses and flats", value_type: "regulatory", source: "AD Part E Table 1.1a" },
  { entity: "STD-004", parameter: "Min airborne sound insulation — separating floors (new-build)", value: "DnT,w + Ctr ≥45", unit: "dB", condition: "Purpose-built", value_type: "regulatory", source: "AD Part E Table 1.1a" },
  { entity: "STD-004", parameter: "Max impact sound — separating floors (new-build)", value: "L'nT,w ≤62", unit: "dB", condition: "Purpose-built", value_type: "regulatory", source: "AD Part E Table 1.1a" },
  { entity: "STD-004", parameter: "Min airborne — separating walls (conversions)", value: "DnT,w + Ctr ≥43", unit: "dB", condition: "Material change of use", value_type: "regulatory", source: "AD Part E Table 1.1a" },
  { entity: "STD-004", parameter: "Max impact — separating floors (conversions)", value: "L'nT,w ≤64", unit: "dB", condition: "Material change of use", value_type: "regulatory", source: "AD Part E Table 1.1a" },

  // Electrical / BS 7671
  { entity: "STD-008", parameter: "Insulation resistance test voltage — circuits up to 500V", value: "500", unit: "V DC", condition: "Domestic 230/400V; equipment disconnected", value_type: "bs_standard", source: "BS 7671:2018 Amd.2 Table 64; Reg.643.3.1" },
  { entity: "STD-008", parameter: "Minimum insulation resistance — circuits up to 500V", value: "≥1.0", unit: "MΩ", condition: "At 500V DC test", value_type: "bs_standard", source: "BS 7671:2018 Amd.2 Table 64" },
  { entity: "STD-008", parameter: "30mA RCD trip time at 1× rated residual current", value: "≤300", unit: "ms", condition: "Non-delayed type; AC setting", value_type: "bs_standard", source: "BS 7671:2018 Amd.2 Reg.643.8" },
  { entity: "STD-008", parameter: "30mA RCD trip time at 5× rated residual current", value: "≤40", unit: "ms", condition: "Additional protection", value_type: "bs_standard", source: "BS 7671:2018 Amd.2; BS EN 61008-1 Table 1" },
  { entity: "STD-008", parameter: "30mA RCD non-trip at 50% test (15mA)", value: "no trip", unit: "—", condition: "Must not nuisance-trip", value_type: "bs_standard", source: "BS 7671:2018 Amd.2" },
  { entity: "STD-008", parameter: "Maximum earth fault loop impedance (Zs) for 30mA RCD on TT", value: "≤1667", unit: "Ω", condition: "50/0.03 = 1667Ω; touch voltage ≤50V", value_type: "bs_standard", source: "BS 7671:2018 Table 41.5" },
  { entity: "TR-008", parameter: "Domestic consumer unit enclosure", value: "Non-combustible (metal)", unit: "—", condition: "All new domestic CUs", value_type: "regulatory", source: "BS 7671:2018 Amd.2; AD Part P" },
  { entity: "TR-008", parameter: "All domestic socket and lighting circuits", value: "30mA RCD protection", unit: "—", condition: "Mandatory for additional protection", value_type: "bs_standard", source: "BS 7671:2018 Amd.2" },

  // Ventilation / Part F
  { entity: "STD-005", parameter: "Intermittent extract — kitchen adjacent to hob", value: "≥30", unit: "l/s", condition: "Intermittent system", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.1" },
  { entity: "STD-005", parameter: "Intermittent extract — kitchen elsewhere", value: "≥60", unit: "l/s", condition: "Not adjacent to appliance", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.1" },
  { entity: "STD-005", parameter: "Intermittent extract — utility room", value: "≥30", unit: "l/s", condition: "", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.1" },
  { entity: "STD-005", parameter: "Intermittent extract — bathroom", value: "≥15", unit: "l/s", condition: "", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.1" },
  { entity: "STD-005", parameter: "Intermittent extract — WC/toilet", value: "≥6", unit: "l/s", condition: "", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.1" },
  { entity: "STD-005", parameter: "Whole dwelling continuous ventilation — 2 bedrooms", value: "≥25", unit: "l/s", condition: "Continuous MEV/MVHR", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.3" },
  { entity: "STD-005", parameter: "Whole dwelling continuous ventilation — 3 bedrooms", value: "≥31", unit: "l/s", condition: "Each extra bedroom adds 6 l/s", value_type: "regulatory", source: "AD Part F Vol.1 (2021) Table 1.3" },

  // Flat roof
  { entity: "PH-010", parameter: "Flat roof minimum design fall", value: "1:40", unit: "gradient", condition: "Design fall to achieve 1:80 as-built after deflection", value_type: "bs_standard", source: "BS 6229:2025 (effective 31 Dec 2025)" },
  { entity: "PH-010", parameter: "Flat roof minimum as-built fall", value: "1:80", unit: "gradient", condition: "After any deflection", value_type: "bs_standard", source: "BS 6229:2025" },

  // Superstructure
  { entity: "PH-007", parameter: "Wall tie horizontal spacing max", value: "≤900", unit: "mm", condition: "Standard cavity wall", value_type: "bs_workmanship", source: "BS EN 845-1; NHBC Ch.6.1" },
  { entity: "PH-007", parameter: "Wall tie vertical spacing max", value: "≤450", unit: "mm", condition: "Standard cavity wall", value_type: "bs_workmanship", source: "BS EN 845-1; NHBC Ch.6.1" },
  { entity: "PH-007", parameter: "Additional ties within distance of openings", value: "300", unit: "mm", condition: "From all openings", value_type: "bs_workmanship", source: "BS EN 845-1; NHBC Ch.6.1" },
];

// ----------------------------------------------------------------------------
// SEQUENCE / PREDECESSOR RULES
// ----------------------------------------------------------------------------
export const SEQUENCE_RULES: SequenceRule[] = [
  { predecessor: "PH-014", relationship: "must_certify_before_payment", successor: "PH-017", basis: "BS 7671 Amd.2 two-stage IR test: Stage 1 at 500V DC must be done at first-fix before walls are boarded", irreversible: true, source: "BS 7671:2018 Amd.2 Reg.643.3.3" },
  { predecessor: "PH-013", relationship: "must_certify_before_payment", successor: "PH-019", basis: "Gas pipework tightness test must be done before pipework is concealed in floors/walls", irreversible: true, source: "Gas Safety (Installation and Use) Regs 1998" },
  { predecessor: "PH-027", relationship: "must_test_before", successor: "PH-029", basis: "Air permeability test result feeds into as-built SAP and is required before BC sign-off", irreversible: false, source: "AD Part L (2021); SAP 10.2 methodology" },
  { predecessor: "PH-027", relationship: "must_certify_before_payment", successor: "PH-029", basis: "Pre-completion sound test result required before BC will issue Completion Certificate", irreversible: false, source: "AD Part E; Building Regs 2010" },
  { predecessor: "PH-001", relationship: "must_complete_before", successor: "PH-003", basis: "CDM Construction Phase Plan and F10 notification required before construction commences on notifiable projects", irreversible: false, source: "CDM 2015 Reg.6, Reg.12" },
  { predecessor: "PH-007", relationship: "trade_handover", successor: "PH-012", basis: "Structural frame complete and signed off before M&E services trades mobilise — standard trade sequence", irreversible: false, source: "IStructE guidance; standard build programme" },
  { predecessor: "PH-009", relationship: "trade_handover", successor: "PH-012", basis: "Building must be weathertight before first-fix joinery/services/insulation — prevents moisture damage", irreversible: false, source: "NHBC Standards 2024" },
  { predecessor: "PH-016", relationship: "must_inspect_before", successor: "PH-017", basis: "Fire stopping at service penetrations must be inspected and photographed BEFORE plasterboard is fixed — once boarded the defect is undetectable", irreversible: true, source: "AD Part B; FIRAS/IFC inspection regime" },
];

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

export const ONTOLOGY = {
  version: ONTOLOGY_VERSION,
  phases: PHASES,
  trades: TRADES,
  materials: MATERIALS,
  standards: STANDARDS,
  defects: DEFECTS,
  evidence_types: EVIDENCE_TYPES,
  compliance_values: COMPLIANCE_VALUES,
  sequence_rules: SEQUENCE_RULES,
};

export function getPhaseById(id: string) {
  return PHASES.find((p) => p.id === id);
}
export function getTradeById(id: string) {
  return TRADES.find((t) => t.id === id);
}
export function getDefectById(id: string) {
  return DEFECTS.find((d) => d.id === id);
}

/**
 * Compact taxonomy block that is always prepended to AI prompts.
 * Small enough (~1.5K tokens) to send on every call.
 */
export function getCompactTaxonomyPrompt(): string {
  const phasesList = PHASES.map((p) => `${p.id} ${p.name}`).join("; ");
  const tradesList = TRADES.map((t) => `${t.id} ${t.name}`).join("; ");
  const defectsList = DEFECTS.map((d) => `${d.id} ${d.name} [${d.severity}]`).join("; ");
  const standardsList = STANDARDS.map((s) => `${s.id} ${s.reference}`).join("; ");

  return `CEMENTO UK CONSTRUCTION ONTOLOGY v${ONTOLOGY_VERSION} — canonical entity IDs to use (England jurisdiction):

PHASES (use IDs PH-001…PH-033): ${phasesList}.

TRADES (use IDs TR-001…TR-018): ${tradesList}.

DEFECT CATALOGUE (use IDs DEF-001…DEF-018): ${defectsList}.

STANDARDS (use IDs STD-001…STD-015): ${standardsList}.

When you identify a phase, trade, defect or standard, use the canonical ID from this list rather than inventing labels. Severity ladder: minor < significant < critical < dangerous.`;
}

/**
 * Build the long-form knowledge chunks for embedding/RAG.
 * One chunk per entity / value, stable source_key for idempotent re-seeding.
 */
export function buildKnowledgeChunks(): Array<{ source_key: string; content: string }> {
  const chunks: Array<{ source_key: string; content: string }> = [];

  // One chunk per phase with its mandatory standards
  for (const p of PHASES) {
    chunks.push({
      source_key: `ontology:phase:${p.id}`,
      content: `${p.id} ${p.name}. RIBA Stage ${p.riba_stage}. Project types: ${p.project_types.join(", ")}. Typical duration: ${p.duration_weeks} weeks.`,
    });
  }

  // One chunk per trade with its standards
  for (const t of TRADES) {
    chunks.push({
      source_key: `ontology:trade:${t.id}`,
      content: `${t.id} ${t.name}. CITB: ${t.citb_classification}. Key governing standards: ${t.key_standards.join(", ")}.`,
    });
  }

  // One chunk per material
  for (const m of MATERIALS) {
    const trades = m.installed_by.map((id) => getTradeById(id)?.name ?? id).join(", ");
    chunks.push({
      source_key: `ontology:material:${m.id}`,
      content: `${m.id} ${m.name}. Governed by ${m.key_standard}. Installed by: ${trades}.`,
    });
  }

  // One chunk per standard
  for (const s of STANDARDS) {
    chunks.push({
      source_key: `ontology:standard:${s.id}`,
      content: `${s.id} ${s.reference} — ${s.title}. Primary trades: ${s.primary_trades.map((id) => getTradeById(id)?.name ?? id).join(", ")}.`,
    });
  }

  // One chunk per defect — rich, visual description for photo recognition
  for (const d of DEFECTS) {
    const phase = getPhaseById(d.phase)?.name ?? d.phase;
    const trade = getTradeById(d.trade)?.name ?? d.trade;
    const visual = d.visual_description ? ` Visual signature: ${d.visual_description}` : "";
    chunks.push({
      source_key: `ontology:defect:${d.id}`,
      content: `${d.id} ${d.name} — Severity: ${d.severity}. Phase: ${d.phase} ${phase}. Responsible trade: ${d.trade} ${trade}. Standards violated: ${d.standards_violated.join(", ")}.${visual}`,
    });
  }

  // One chunk per evidence type
  for (const e of EVIDENCE_TYPES) {
    chunks.push({
      source_key: `ontology:evidence:${e.id}`,
      content: `${e.id} ${e.name}. Can trigger payment release: ${e.can_trigger_payment ? "yes" : "no"}. Legal weight in UK dispute: ${e.legal_weight}.`,
    });
  }

  // One chunk per compliance value
  for (let i = 0; i < COMPLIANCE_VALUES.length; i++) {
    const c = COMPLIANCE_VALUES[i];
    chunks.push({
      source_key: `ontology:compliance:${i}`,
      content: `Compliance threshold (${c.entity}): ${c.parameter} = ${c.value} ${c.unit}. Condition: ${c.condition}. Type: ${c.value_type}. Source: ${c.source}.`,
    });
  }

  // One chunk per sequence rule
  for (let i = 0; i < SEQUENCE_RULES.length; i++) {
    const r = SEQUENCE_RULES[i];
    chunks.push({
      source_key: `ontology:sequence:${i}`,
      content: `Sequence rule: ${r.predecessor} ${r.relationship} ${r.successor}. Basis: ${r.basis}. Irreversible once next phase begins: ${r.irreversible ? "yes" : "no"}. Source: ${r.source}.`,
    });
  }

  return chunks;
}
