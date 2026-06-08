/**
 * Cemento LCM — UK Construction Ontology v1.0
 * Transcribed from: Cemento LCM — UK Construction Ontology: Complete Taxonomy v1.0.pdf
 * Jurisdiction: England (UK) | Status: Draft for professional review
 *
 * Read-only reference data for deterministic contract audit.
 * LLM maps phase_id; this module provides the compliance rules.
 */

// ─── Project types ────────────────────────────────────────────────────────────

export type ProjectType =
  | "new_build_residential"
  | "residential_refurbishment"
  | "extension"
  | "loft_conversion"
  | "commercial_fit_out"
  | "unknown";

// ─── Phases ───────────────────────────────────────────────────────────────────

export interface OntologyPhase {
  phase_id: string;         // PH-001 … PH-033
  phase_name: string;
  riba_stage: number;       // 1–6
  project_types: string[];  // project type slugs, or ["all"]
  typical_duration_weeks: { min: number; max: number };
  match_keywords: string[]; // terms that appear in contracts for this phase
  irreversible_capture: boolean; // evidence must be captured before next phase covers the work
}

export const PHASES: OntologyPhase[] = [
  {
    phase_id: "PH-001",
    phase_name: "Pre-Construction: Site Setup and Mobilisation",
    riba_stage: 1,
    project_types: ["all"],
    typical_duration_weeks: { min: 4, max: 5 },
    match_keywords: ["mobilisation", "mobilization", "site setup", "enabling works", "preliminaries", "pre-construction", "CDM", "site hoarding", "welfare"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-002",
    phase_name: "Demolition and Strip Out",
    riba_stage: 1,
    project_types: ["residential_refurbishment", "commercial_fit_out", "extension"],
    typical_duration_weeks: { min: 5, max: 5 },
    match_keywords: ["demolition", "strip out", "strip-out", "stripping out", "breaking out", "asbestos removal", "enabling"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-003",
    phase_name: "Groundworks: Bulk Excavation",
    riba_stage: 1,
    project_types: ["new_build_residential", "extension"],
    typical_duration_weeks: { min: 5, max: 5 },
    match_keywords: ["excavation", "bulk excavation", "dig", "groundworks", "earthworks", "cut and fill"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-004",
    phase_name: "Groundworks: Drainage Installation",
    riba_stage: 1,
    project_types: ["new_build_residential", "extension", "commercial_fit_out"],
    typical_duration_weeks: { min: 5, max: 5 },
    match_keywords: ["drainage", "foul drainage", "surface water", "SUDS", "soakaway", "underground drainage", "drains", "sewer connection"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-005",
    phase_name: "Foundations",
    riba_stage: 1,
    project_types: ["new_build_residential", "extension"],
    typical_duration_weeks: { min: 5, max: 5 },
    match_keywords: ["foundations", "strip foundations", "raft", "piled foundations", "pad foundations", "concrete foundations", "footings"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-006",
    phase_name: "Substructure: Ground Floor Slab and DPC",
    riba_stage: 1,
    project_types: ["new_build_residential", "extension"],
    typical_duration_weeks: { min: 5, max: 5 },
    match_keywords: ["ground floor slab", "slab", "DPC", "damp proof course", "substructure", "oversite", "ground beam"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-007",
    phase_name: "Superstructure: External and Internal Masonry / Frame",
    riba_stage: 5,
    project_types: ["new_build_residential", "extension"],
    typical_duration_weeks: { min: 4, max: 12 },
    match_keywords: ["masonry", "brickwork", "blockwork", "superstructure", "structural frame", "steel frame", "cavity wall", "external walls", "party wall"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-008",
    phase_name: "Roof Structure",
    riba_stage: 5,
    project_types: ["new_build_residential", "extension", "loft_conversion"],
    typical_duration_weeks: { min: 1, max: 3 },
    match_keywords: ["roof structure", "roof joists", "rafters", "ridge board", "roof timbers", "truss roof", "cut roof"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-009",
    phase_name: "Roofing: Weatherproofing (Pitched)",
    riba_stage: 5,
    project_types: ["new_build_residential", "extension", "loft_conversion"],
    typical_duration_weeks: { min: 1, max: 3 },
    match_keywords: ["roofing", "pitched roof", "roof tiles", "roof slates", "felt", "battens", "flashings", "ridge tiles", "gutters", "weatherproofing"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-010",
    phase_name: "Roofing: Weatherproofing (Flat)",
    riba_stage: 5,
    project_types: ["new_build_residential", "extension", "commercial_fit_out"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["flat roof", "flat roofing", "EPDM", "GRP", "felt flat roof", "liquid waterproofing", "warm roof", "inverted roof"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-011",
    phase_name: "External Windows and Doors",
    riba_stage: 5,
    project_types: ["new_build_residential", "residential_refurbishment", "extension", "loft_conversion"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["windows", "external doors", "glazing", "window installation", "bifold", "French doors", "rooflights", "Velux"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-012",
    phase_name: "First Fix Carpentry",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["first fix carpentry", "first fix joinery", "stud walls", "door linings", "joist noggins", "flooring substrate", "1st fix carpentry"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-013",
    phase_name: "First Fix Plumbing",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 3 },
    match_keywords: ["first fix plumbing", "1st fix plumbing", "soil pipes", "waste pipes", "hot and cold supplies", "underfloor heating", "UFH pipework"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-014",
    phase_name: "First Fix Electrical",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["first fix electrical", "1st fix electrical", "cable routes", "back boxes", "consumer unit", "earth bonding", "wiring"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-015",
    phase_name: "Insulation Installation",
    riba_stage: 5,
    project_types: ["new_build_residential", "residential_refurbishment", "extension", "loft_conversion"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["insulation", "PIR insulation", "mineral wool", "cavity insulation", "loft insulation", "floor insulation", "thermal insulation"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-016",
    phase_name: "Fire Stopping and Compartmentation",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["fire stopping", "compartmentation", "fire protection", "intumescent", "passive fire", "fire barriers", "fire seals"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-017",
    phase_name: "Plastering and Screeding",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 2, max: 4 },
    match_keywords: ["plastering", "plasterboard", "drylining", "screeding", "floor screed", "dry lining", "boarding", "skim"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-018",
    phase_name: "Second Fix Carpentry",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 3 },
    match_keywords: ["second fix carpentry", "2nd fix carpentry", "skirting", "architrave", "doors hung", "staircase", "balustrade", "wardrobes"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-019",
    phase_name: "Second Fix Plumbing",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["second fix plumbing", "2nd fix plumbing", "sanitaryware", "taps", "shower", "boiler commissioning", "pressure test"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-020",
    phase_name: "Second Fix Electrical",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["second fix electrical", "2nd fix electrical", "sockets", "switches", "light fittings", "NICEIC", "EIC", "electrical installation certificate"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-021",
    phase_name: "Tiling",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["tiling", "wall tiles", "floor tiles", "grouting", "tanking", "wet room"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-022",
    phase_name: "Flooring",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["flooring", "floor covering", "carpet", "LVT", "hardwood floor", "engineered floor", "underlay", "threshold"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-023",
    phase_name: "Decoration",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 3 },
    match_keywords: ["decoration", "decorating", "painting", "emulsion", "gloss", "mist coat", "redecoration"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-024",
    phase_name: "Kitchen and Bathroom Fitting",
    riba_stage: 5,
    project_types: ["new_build_residential", "residential_refurbishment", "extension"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["kitchen", "kitchen fitting", "bathroom fitting", "kitchen units", "worktops", "appliances", "bathroom suite"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-025",
    phase_name: "HVAC and Mechanical Ventilation",
    riba_stage: 5,
    project_types: ["new_build_residential", "extension", "commercial_fit_out"],
    typical_duration_weeks: { min: 1, max: 3 },
    match_keywords: ["HVAC", "mechanical ventilation", "MVHR", "heat pump", "underfloor heating", "boiler", "heating system", "ventilation"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-026",
    phase_name: "External Works and Landscaping",
    riba_stage: 5,
    project_types: ["new_build_residential", "extension"],
    typical_duration_weeks: { min: 1, max: 4 },
    match_keywords: ["external works", "landscaping", "paving", "fencing", "driveway", "paths", "garden", "boundary walls"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-027",
    phase_name: "Testing and Commissioning",
    riba_stage: 5,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["testing", "commissioning", "air tightness test", "sound test", "pressure test", "SAP", "building control inspection", "sign-off"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-028",
    phase_name: "Snagging",
    riba_stage: 6,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 2 },
    match_keywords: ["snagging", "defects", "snag list", "snagging list", "rectification"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-029",
    phase_name: "Handover and Practical Completion",
    riba_stage: 6,
    project_types: ["all"],
    typical_duration_weeks: { min: 1, max: 1 },
    match_keywords: ["handover", "practical completion", "PC", "completion", "certificate of practical completion", "keys", "O&M manuals", "final account"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-030",
    phase_name: "Loft Conversion: Roof Strip and Temporary Support",
    riba_stage: 5,
    project_types: ["loft_conversion"],
    typical_duration_weeks: { min: 1, max: 1 },
    match_keywords: ["roof strip", "temporary support", "needling", "propping", "loft roof"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-031",
    phase_name: "Loft Conversion: Steel Beam Installation",
    riba_stage: 5,
    project_types: ["loft_conversion"],
    typical_duration_weeks: { min: 1, max: 1 },
    match_keywords: ["steel beam", "RSJ", "structural steel", "ridge beam", "loft steels", "padstone"],
    irreversible_capture: true,
  },
  {
    phase_id: "PH-032",
    phase_name: "Commercial Fit-Out: Partition and Ceiling Systems",
    riba_stage: 5,
    project_types: ["commercial_fit_out"],
    typical_duration_weeks: { min: 2, max: 6 },
    match_keywords: ["partitions", "demountable partitions", "suspended ceiling", "raised floor", "ceiling grid", "fit-out"],
    irreversible_capture: false,
  },
  {
    phase_id: "PH-033",
    phase_name: "Residential Refurbishment: Structural Alterations",
    riba_stage: 5,
    project_types: ["residential_refurbishment"],
    typical_duration_weeks: { min: 1, max: 4 },
    match_keywords: ["structural alterations", "structural works", "steel beams", "RSJ installation", "opening up", "lintels", "party wall", "structural engineer"],
    irreversible_capture: true,
  },
];

// ─── Evidence types ───────────────────────────────────────────────────────────

export interface OntologyEvidenceType {
  evidence_id: string;        // EV-001 … EV-017
  evidence_name: string;
  phases_generated: string[]; // phase_ids, or ["all_phases"]
  can_trigger_payment_release: boolean;
  legal_weight: "low" | "low-medium" | "medium" | "medium-high" | "high" | "very_high";
}

export const EVIDENCE_TYPES: OntologyEvidenceType[] = [
  {
    evidence_id: "EV-001",
    evidence_name: "Progress Photograph",
    phases_generated: ["all_phases"],
    can_trigger_payment_release: true,
    legal_weight: "low-medium",
  },
  {
    evidence_id: "EV-002",
    evidence_name: "Architect's Instruction (AI)",
    phases_generated: ["all_phases"],
    can_trigger_payment_release: false,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-003",
    evidence_name: "Variation Order (VO)",
    phases_generated: ["all_phases"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-004",
    evidence_name: "Site Inspection Certificate",
    phases_generated: ["all_phases"],
    can_trigger_payment_release: true,
    legal_weight: "medium-high",
  },
  {
    evidence_id: "EV-005",
    evidence_name: "Building Control Inspection Notice",
    phases_generated: ["PH-005", "PH-006", "PH-007", "PH-014", "PH-016", "PH-027", "PH-029"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-006",
    evidence_name: "Structural Engineer Sign-Off",
    phases_generated: ["PH-005", "PH-006", "PH-007", "PH-031", "PH-033"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-007",
    evidence_name: "Gas Safe Certificate",
    phases_generated: ["PH-019", "PH-025", "PH-027"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-008",
    evidence_name: "Electrical Installation Certificate (EIC)",
    phases_generated: ["PH-014", "PH-020", "PH-027"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-009",
    evidence_name: "Plumbing Hydraulic Pressure Test Certificate",
    phases_generated: ["PH-013", "PH-019", "PH-027"],
    can_trigger_payment_release: true,
    legal_weight: "medium",
  },
  {
    evidence_id: "EV-010",
    evidence_name: "Air Tightness Test Certificate",
    phases_generated: ["PH-027"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-011",
    evidence_name: "Pre-Completion Sound Test Certificate (Part E)",
    phases_generated: ["PH-027"],
    can_trigger_payment_release: false,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-012",
    evidence_name: "Energy Performance Certificate (EPC)",
    phases_generated: ["PH-029"],
    can_trigger_payment_release: false,
    legal_weight: "medium",
  },
  {
    evidence_id: "EV-013",
    evidence_name: "Snagging List",
    phases_generated: ["PH-028"],
    can_trigger_payment_release: false,
    legal_weight: "medium",
  },
  {
    evidence_id: "EV-014",
    evidence_name: "Practical Completion Certificate",
    phases_generated: ["PH-029"],
    can_trigger_payment_release: true,
    legal_weight: "very_high",
  },
  {
    evidence_id: "EV-015",
    evidence_name: "Building Control Completion Certificate",
    phases_generated: ["PH-029"],
    can_trigger_payment_release: true,
    legal_weight: "very_high",
  },
  {
    evidence_id: "EV-016",
    evidence_name: "Defects Liability Certificate",
    phases_generated: ["PH-028", "PH-029"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
  {
    evidence_id: "EV-017",
    evidence_name: "Retention Release Notice",
    phases_generated: ["PH-029"],
    can_trigger_payment_release: true,
    legal_weight: "high",
  },
];

// ─── Phase dependencies (v0.1) ────────────────────────────────────────────────
// Sequential ordering by project type. irreversible_capture phases must be
// photo-documented before the next phase begins — the work will be concealed.

export interface OntologyPhaseDep {
  phase_id: string;
  depends_on: string[];     // phase_ids that must precede this
  irreversible_capture: boolean;
  irreversible_reason: string | null;
}

export const PHASE_DEPS: OntologyPhaseDep[] = [
  { phase_id: "PH-001", depends_on: [], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-002", depends_on: ["PH-001"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-003", depends_on: ["PH-001"], irreversible_capture: true, irreversible_reason: "Excavation profile will be obscured by subsequent concrete pours" },
  { phase_id: "PH-004", depends_on: ["PH-003"], irreversible_capture: true, irreversible_reason: "Below-ground drainage will be backfilled — confirm falls and pipe routes before covering" },
  { phase_id: "PH-005", depends_on: ["PH-003", "PH-004"], irreversible_capture: true, irreversible_reason: "Foundation concrete once poured cannot be inspected without excavation" },
  { phase_id: "PH-006", depends_on: ["PH-005"], irreversible_capture: true, irreversible_reason: "DPC position and ground floor slab will be concealed by floor finishes" },
  { phase_id: "PH-007", depends_on: ["PH-006"], irreversible_capture: true, irreversible_reason: "Cavity wall ties and internal cavity will be sealed — verify before cavity is closed" },
  { phase_id: "PH-008", depends_on: ["PH-007"], irreversible_capture: true, irreversible_reason: "Roof structure will be concealed by roofing and insulation" },
  { phase_id: "PH-009", depends_on: ["PH-008"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-010", depends_on: ["PH-008"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-011", depends_on: ["PH-007"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-012", depends_on: ["PH-007"], irreversible_capture: true, irreversible_reason: "Stud walls and floor substrate will be covered by plasterboard and screeds" },
  { phase_id: "PH-013", depends_on: ["PH-012"], irreversible_capture: true, irreversible_reason: "First fix pipework will be concealed by plasterboard — verify fall gradients before boarding" },
  { phase_id: "PH-014", depends_on: ["PH-012"], irreversible_capture: true, irreversible_reason: "First fix cable routes will be concealed — record routing before boarding" },
  { phase_id: "PH-015", depends_on: ["PH-012"], irreversible_capture: true, irreversible_reason: "Insulation will be concealed by plasterboard — verify thickness and continuity before boarding" },
  { phase_id: "PH-016", depends_on: ["PH-012", "PH-013", "PH-014"], irreversible_capture: true, irreversible_reason: "Fire stopping at penetrations will be concealed — critical to capture before boarding" },
  { phase_id: "PH-017", depends_on: ["PH-015", "PH-016"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-018", depends_on: ["PH-017"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-019", depends_on: ["PH-017"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-020", depends_on: ["PH-017"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-021", depends_on: ["PH-019"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-022", depends_on: ["PH-021", "PH-017"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-023", depends_on: ["PH-018", "PH-017"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-024", depends_on: ["PH-021", "PH-019", "PH-020"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-025", depends_on: ["PH-014"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-026", depends_on: ["PH-006"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-027", depends_on: ["PH-018", "PH-019", "PH-020", "PH-025"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-028", depends_on: ["PH-027"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-029", depends_on: ["PH-028"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-030", depends_on: ["PH-001"], irreversible_capture: true, irreversible_reason: "Existing roof structure must be documented before temporary propping is removed" },
  { phase_id: "PH-031", depends_on: ["PH-030"], irreversible_capture: true, irreversible_reason: "Steel beam bearing and padstone must be captured before masonry is built up around it" },
  { phase_id: "PH-032", depends_on: ["PH-014"], irreversible_capture: false, irreversible_reason: null },
  { phase_id: "PH-033", depends_on: ["PH-002"], irreversible_capture: true, irreversible_reason: "Structural opening formation and temporary supports must be documented before steels are encased" },
];

// ─── Phase-list strings for LLM prompt injection ──────────────────────────────

/** Compact phase list for injection into the extraction prompt. */
export const PHASE_LIST_FOR_PROMPT = PHASES.map(
  (p) => `${p.phase_id}: ${p.phase_name} [${p.project_types.join(", ")}]`
).join("\n");
