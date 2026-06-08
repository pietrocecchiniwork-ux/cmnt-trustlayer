/**
 * Compact Cemento UK Construction Ontology taxonomy.
 *
 * This is the SHORT version that is prepended to every AI call.
 * The FULL ontology (with compliance values, defect signatures, sequence rules)
 * is embedded into knowledge_chunks and retrieved per-query via retrieve-knowledge.
 *
 * Keep in sync with src/data/ontology/index.ts (entity IDs and names only).
 */

export const ONTOLOGY_VERSION = "1.0";

export const COMPACT_TAXONOMY_PROMPT = `CEMENTO UK CONSTRUCTION ONTOLOGY v${ONTOLOGY_VERSION} — canonical entity IDs to use (England jurisdiction):

PHASES (use IDs PH-001…PH-033):
PH-001 Pre-Construction: Site Setup and Mobilisation; PH-002 Demolition and Strip Out; PH-003 Groundworks: Bulk Excavation; PH-004 Groundworks: Drainage Installation; PH-005 Foundations; PH-006 Substructure: Ground Floor Slab and DPC; PH-007 Superstructure: External and Internal Masonry / Frame; PH-008 Roof Structure; PH-009 Roofing: Weatherproofing (Pitched); PH-010 Roofing: Weatherproofing (Flat); PH-011 External Windows and Doors; PH-012 First Fix Carpentry; PH-013 First Fix Plumbing; PH-014 First Fix Electrical; PH-015 Insulation Installation; PH-016 Fire Stopping and Compartmentation; PH-017 Plastering and Screeding; PH-018 Second Fix Carpentry; PH-019 Second Fix Plumbing; PH-020 Second Fix Electrical; PH-021 Tiling; PH-022 Flooring; PH-023 Decoration; PH-024 Kitchen and Bathroom Fitting; PH-025 HVAC and Mechanical Ventilation; PH-026 External Works and Landscaping; PH-027 Testing and Commissioning; PH-028 Snagging; PH-029 Handover and Practical Completion; PH-030 Loft Conversion: Roof Strip; PH-031 Loft Conversion: Steel Beam Installation; PH-032 Commercial Fit-Out: Partition and Ceiling Systems; PH-033 Residential Refurbishment: Structural Alterations.

TRADES (use IDs TR-001…TR-018):
TR-001 Main Contractor / Site Manager; TR-002 Groundworker; TR-003 Bricklayer; TR-004 Structural Engineer; TR-005 Carpenter / Joiner; TR-006 Roofer; TR-007 Plumber; TR-008 Electrician; TR-009 Plasterer; TR-010 Tiler; TR-011 Decorator; TR-012 Glazier; TR-013 Insulation Installer; TR-014 Flooring Installer; TR-015 Kitchen Fitter; TR-016 Landscape Gardener; TR-017 HVAC Engineer; TR-018 Fire Protection Installer.

DEFECT CATALOGUE (use IDs DEF-001…DEF-018, severity in brackets):
DEF-001 Thermal Bridging [significant]; DEF-002 Inadequate Fire Stopping [critical]; DEF-003 Incorrect Pipe Fall Gradient [significant]; DEF-004 Unsupported Pipe Runs [minor]; DEF-005 Moisture Ingress Through Roof [significant]; DEF-006 Inadequate or Bridged DPC [significant]; DEF-007 Insufficient Insulation Thickness [significant]; DEF-008 Incorrect Cable Installation [critical]; DEF-009 Missing or Failed Cavity Wall Ties [dangerous]; DEF-010 Poor Plastering Workmanship [minor]; DEF-011 Tile Delamination [significant]; DEF-012 Flat Roof Ponding [significant]; DEF-013 Inadequate Drainage Falls Internal [significant]; DEF-014 Substandard Concrete Honeycombing [critical]; DEF-015 Missing Cavity Wall Ties During Construction [dangerous]; DEF-016 Inadequate Mechanical Extract Ventilation [significant]; DEF-017 Timber Decay Wet/Dry Rot [significant]; DEF-018 Joist Notching Outside Permitted Zone [significant].

STANDARDS (use IDs STD-001…STD-015):
STD-001 AD Part A (Structure); STD-002 AD Part B Vol 1 (Fire Safety Dwellings); STD-003 AD Part C (Site Prep & Moisture); STD-004 AD Part E (Sound); STD-005 AD Part F Vol 1 2022 (Ventilation Dwellings); STD-006 AD Part L Vol 1 2021 (Energy Dwellings); STD-007 AD Part P 2013 (Electrical Safety); STD-008 BS 7671:2018 Amd 2 (Wiring Regs); STD-009 BS 8000 series (Workmanship); STD-010 BS 5250:2021 (Moisture Management); STD-011 BS 6229:2025 (Flat Roofs); STD-012 BS 8102:2022 (Below Ground Waterproofing); STD-013 NHBC Standards 2024; STD-014 AD Part H 2015 (Drainage); STD-015 Gas Safety (Installation and Use) Regs 1998.

Severity ladder: minor < significant < critical < dangerous. When you identify a phase, trade, defect or standard, use the canonical ID from this list rather than inventing labels.`;
