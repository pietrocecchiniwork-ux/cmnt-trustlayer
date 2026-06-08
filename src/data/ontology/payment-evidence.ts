/**
 * Payment-evidence + capture-warning helpers derived from the ontology.
 *
 * These mappings are ADVISORY ONLY. The UI must always frame results as
 * "usually required for this project type — confirm with your CA". Never
 * present as compliant / non-compliant.
 */

import {
  PHASES,
  EVIDENCE_TYPES,
  SEQUENCE_RULES,
  getPhaseById,
  type Phase,
  type EvidenceType,
  type SequenceRule,
} from "./index";

/**
 * Phase → evidence types that typically gate payment for that phase.
 * Built from EVIDENCE_TYPES.can_trigger_payment + trade context. Hand-mapped
 * to the 33 phases; missing entries fall back to "Progress Photograph".
 */
const PHASE_TO_PAYMENT_EVIDENCE_IDS: Record<string, string[]> = {
  "PH-001": ["EV-001"],
  "PH-002": ["EV-001", "EV-002"],
  "PH-003": ["EV-001", "EV-004"],
  "PH-004": ["EV-001", "EV-005"],
  "PH-005": ["EV-001", "EV-005", "EV-006"],
  "PH-006": ["EV-001", "EV-005"],
  "PH-007": ["EV-001", "EV-006"],
  "PH-008": ["EV-001", "EV-006"],
  "PH-009": ["EV-001", "EV-004"],
  "PH-010": ["EV-001", "EV-004"],
  "PH-011": ["EV-001"],
  "PH-012": ["EV-001"],
  "PH-013": ["EV-001", "EV-009"],
  "PH-014": ["EV-001", "EV-008"],
  "PH-015": ["EV-001"],
  "PH-016": ["EV-001", "EV-004"],
  "PH-017": ["EV-001"],
  "PH-018": ["EV-001"],
  "PH-019": ["EV-001", "EV-007", "EV-009"],
  "PH-020": ["EV-001", "EV-008"],
  "PH-021": ["EV-001"],
  "PH-022": ["EV-001"],
  "PH-023": ["EV-001"],
  "PH-024": ["EV-001", "EV-007"],
  "PH-025": ["EV-001", "EV-007"],
  "PH-026": ["EV-001"],
  "PH-027": ["EV-010", "EV-011", "EV-012"],
  "PH-028": ["EV-013"],
  "PH-029": ["EV-014", "EV-015", "EV-016", "EV-017"],
  "PH-030": ["EV-001", "EV-002"],
  "PH-031": ["EV-001", "EV-006"],
  "PH-032": ["EV-001"],
  "PH-033": ["EV-001", "EV-006"],
};

export interface PaymentDocSuggestion {
  evidence_id: string;
  name: string;
  legal_weight: string;
  can_trigger_payment: boolean;
}

export function getPaymentDocsForPhase(phaseId: string | null | undefined): PaymentDocSuggestion[] {
  if (!phaseId) return [];
  const ids = PHASE_TO_PAYMENT_EVIDENCE_IDS[phaseId] ?? ["EV-001"];
  const byId = new Map<string, EvidenceType>(EVIDENCE_TYPES.map((e) => [e.id, e]));
  return ids
    .map((id) => byId.get(id))
    .filter((e): e is EvidenceType => !!e)
    .map((e) => ({
      evidence_id: e.id,
      name: e.name,
      legal_weight: e.legal_weight,
      can_trigger_payment: e.can_trigger_payment,
    }));
}

export interface CaptureWarning {
  rule: SequenceRule;
  predecessor_name: string;
  successor_name: string;
  message: string;
}

/**
 * For a given phase, return any "capture before it's covered" warnings
 * (irreversible sequence rules where this phase is the predecessor and gets
 * physically covered/concealed by the successor).
 */
export function getCaptureWarningsForPhase(phaseId: string | null | undefined): CaptureWarning[] {
  if (!phaseId) return [];
  return SEQUENCE_RULES.filter((r) => r.predecessor === phaseId && r.irreversible).map((r) => {
    const pred = getPhaseById(r.predecessor)?.name ?? r.predecessor;
    const succ = getPhaseById(r.successor)?.name ?? r.successor;
    return {
      rule: r,
      predecessor_name: pred,
      successor_name: succ,
      message: `Photograph before ${succ.toLowerCase()} begins — once covered the work is unverifiable. ${r.basis}`,
    };
  });
}

export interface MissingPhaseSuggestion {
  phase: Phase;
  reason: string;
}

/**
 * Phases the AI thinks are missing from the parsed contract given the
 * project type. Pure ontology heuristic — always advisory.
 */
export function getSuggestedMissingPhases(
  projectType: string | null | undefined,
  presentPhaseIds: string[],
): MissingPhaseSuggestion[] {
  const present = new Set(presentPhaseIds.filter(Boolean));
  const pt = (projectType ?? "").toLowerCase();

  // Core phases typically expected on any build with structural work
  const coreExpected = [
    "PH-001", // mobilisation
    "PH-016", // fire stopping
    "PH-027", // testing & commissioning
    "PH-029", // handover / PC
  ];
  // Project-type specific
  const byType: Record<string, string[]> = {
    new_build: ["PH-003", "PH-005", "PH-006", "PH-007", "PH-013", "PH-014", "PH-015", "PH-029"],
    extension: ["PH-003", "PH-005", "PH-007", "PH-015", "PH-029"],
    loft: ["PH-030", "PH-031", "PH-015", "PH-029"],
    refurb: ["PH-002", "PH-033", "PH-029"],
    fit_out: ["PH-002", "PH-032", "PH-014", "PH-029"],
    commercial_fit_out: ["PH-032", "PH-014", "PH-025", "PH-029"],
  };

  const expected = new Set<string>([...coreExpected, ...(byType[pt] ?? [])]);
  const missing = [...expected].filter((id) => !present.has(id));

  return missing
    .map((id) => getPhaseById(id))
    .filter((p): p is Phase => !!p)
    .map((p) => ({
      phase: p,
      reason: pt
        ? `usually required for ${pt.replace("_", " ")} projects — confirm with your CA`
        : `commonly missing from contracts — confirm with your CA`,
    }));
}
