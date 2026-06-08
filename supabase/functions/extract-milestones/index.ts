import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  PHASES,
  EVIDENCE_TYPES,
  PHASE_DEPS,
  PHASE_LIST_FOR_PROMPT,
  type ProjectType,
} from "../_shared/ontology.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_TYPES = ["jpg", "jpeg", "png"];

// ─── Ontology types ───────────────────────────────────────────────────────────

interface ExtractedMilestone {
  name: string;
  due_date: string | null;
  payment_value: number | null;
  trade: string | null;
  description: string | null;
  phase_id: string | null;
}

interface MissingPhaseFlag {
  phase_id: string;
  phase_name: string;
}

interface EvidenceRequirement {
  phase_id: string;
  milestone_name: string;
  evidence: Array<{
    evidence_id: string;
    evidence_name: string;
    can_trigger_payment_release: boolean;
    legal_weight: string;
  }>;
}

interface IrreversibleWarning {
  phase_id: string;
  milestone_name: string;
  reason: string;
}

interface ContractFlags {
  project_type: ProjectType;
  missing_phases: MissingPhaseFlag[];
  evidence_required: EvidenceRequirement[];
  irreversible_warnings: IrreversibleWarning[];
}

// ─── Deterministic ontology audit ────────────────────────────────────────────

const PROJECT_TYPES: ProjectType[] = [
  "new_build_residential",
  "residential_refurbishment",
  "extension",
  "loft_conversion",
  "commercial_fit_out",
];

function auditMilestones(
  milestones: ExtractedMilestone[],
  projectType: ProjectType,
): ContractFlags {
  const foundPhaseIds = new Set(
    milestones.map((m) => m.phase_id).filter(Boolean) as string[],
  );

  // 1. Phases expected for this project_type that are absent from the contract
  const expectedPhases = PHASES.filter(
    (p) =>
      p.project_types.includes("all") ||
      p.project_types.includes(projectType),
  );
  const missingPhases: MissingPhaseFlag[] = expectedPhases
    .filter((p) => !foundPhaseIds.has(p.phase_id))
    // Omit snagging / handover from "missing" — these are often implicit
    .filter((p) => !["PH-028", "PH-029"].includes(p.phase_id))
    .map((p) => ({ phase_id: p.phase_id, phase_name: p.phase_name }));

  // 2. Evidence required per milestone (where phase_id is known)
  const evidenceRequired: EvidenceRequirement[] = [];
  for (const m of milestones) {
    if (!m.phase_id) continue;
    const ev = EVIDENCE_TYPES.filter(
      (e) =>
        e.phases_generated.includes("all_phases") ||
        e.phases_generated.includes(m.phase_id!),
    );
    const specific = ev.filter((e) => e.evidence_id !== "EV-001");
    const list = specific.length > 0 ? specific : ev;
    if (list.length > 0) {
      evidenceRequired.push({
        phase_id: m.phase_id,
        milestone_name: m.name,
        evidence: list.map((e) => ({
          evidence_id: e.evidence_id,
          evidence_name: e.evidence_name,
          can_trigger_payment_release: e.can_trigger_payment_release,
          legal_weight: e.legal_weight,
        })),
      });
    }
  }

  // 3. Irreversible capture warnings — phases where work will be concealed
  const irreversibleWarnings: IrreversibleWarning[] = [];
  for (const m of milestones) {
    if (!m.phase_id) continue;
    const dep = PHASE_DEPS.find((d) => d.phase_id === m.phase_id);
    if (dep?.irreversible_capture && dep.irreversible_reason) {
      irreversibleWarnings.push({
        phase_id: m.phase_id,
        milestone_name: m.name,
        reason: dep.irreversible_reason,
      });
    }
  }

  return {
    project_type: projectType,
    missing_phases: missingPhases,
    evidence_required: evidenceRequired,
    irreversible_warnings: irreversibleWarnings,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { contract_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { contract_id } = body;
  if (!contract_id) {
    return new Response(JSON.stringify({ error: "contract_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Service-role client (bypasses RLS for Storage reads and contracts update) ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch the contracts row
  const { data: contract, error: contractErr } = await adminClient
    .from("contracts")
    .select("id, file_path, file_name, parsed_status")
    .eq("id", contract_id)
    .single();

  if (contractErr || !contract) {
    return new Response(JSON.stringify({ error: "Contract not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (contract.parsed_status !== "uploaded") {
    return new Response(
      JSON.stringify({ error: `Contract is already in state: ${contract.parsed_status}` }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2. Mark as parsing
  await adminClient
    .from("contracts")
    .update({ parsed_status: "parsing" })
    .eq("id", contract_id);

  // 3. Download file from Storage
  const { data: fileData, error: storageErr } = await adminClient.storage
    .from("contracts")
    .download(contract.file_path);

  if (storageErr || !fileData) {
    await adminClient
      .from("contracts")
      .update({ parsed_status: "error", error_message: "Failed to read file from storage" })
      .eq("id", contract_id);
    return new Response(JSON.stringify({ error: "Failed to read file from storage" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Determine file type from file_path / file_name
  const fileName = contract.file_name ?? contract.file_path;
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const isImage = IMAGE_TYPES.includes(ext);
  const isPdf = ext === "pdf";

  if (!isImage && !isPdf) {
    await adminClient
      .from("contracts")
      .update({ parsed_status: "error", error_message: "Unsupported file type" })
      .eq("id", contract_id);
    return new Response(
      JSON.stringify({ error: "Unsupported file type. Please upload a PDF or image (JPG, PNG)." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 5. Convert Blob to base64
  const arrayBuffer = await fileData.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const file_base64 = btoa(binary);

  // 6. Build Anthropic content blocks
  const PROMPT = `You are analysing a UK construction contract or schedule of works.

Extract the following and return ONLY a valid JSON object with two top-level keys:

1. "project_type": classify the project as exactly one of: ${PROJECT_TYPES.join(", ")} — or "unknown" if not determinable.

2. "milestones": a JSON array where each object has exactly these fields:
   - name: string (max 60 chars, the milestone or stage name as written in the contract)
   - due_date: ISO date string YYYY-MM-DD or null
   - payment_value: number (GBP, no currency symbol) or null
   - trade: string describing the responsible trade/contractor type, or null
   - description: one sentence describing the scope of work, or null
   - phase_id: best-effort match to ONE of the ontology phase IDs below, or null if no match

Ontology phase IDs for matching:
${PHASE_LIST_FOR_PROMPT}

Rules:
- Map each milestone to the single most appropriate phase_id. If uncertain, use null.
- The LLM must not make compliance judgements — just extract and map.
- If the document contains no readable milestone or payment schedule data, return { "project_type": "unknown", "milestones": [] }.
- No explanation. No markdown. Return only the JSON object.`;

  let contentBlocks: unknown[];

  if (isPdf) {
    contentBlocks = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: file_base64 },
      },
      { type: "text", text: PROMPT },
    ];
  } else {
    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    contentBlocks = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaTypeMap[ext] ?? "image/jpeg",
          data: file_base64,
        },
      },
      { type: "text", text: PROMPT },
    ];
  }

  // 7. Call Anthropic
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic API error:", anthropicRes.status, errText);
    const errMsg = anthropicRes.status === 429
      ? "Rate limited — please try again shortly."
      : "AI error";
    await adminClient
      .from("contracts")
      .update({ parsed_status: "error", error_message: errMsg })
      .eq("id", contract_id);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: anthropicRes.status === 429 ? 429 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await anthropicRes.json();
  const rawText: string = result.content?.[0]?.text ?? "";

  // 8. Parse LLM response
  let parsed: { project_type?: string; milestones?: unknown[] } = {};
  try {
    const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse AI response:", rawText, e);
  }

  const milestones: ExtractedMilestone[] = Array.isArray(parsed.milestones)
    ? (parsed.milestones as ExtractedMilestone[])
    : [];

  const projectType: ProjectType =
    PROJECT_TYPES.includes(parsed.project_type as ProjectType)
      ? (parsed.project_type as ProjectType)
      : "unknown";

  if (milestones.length === 0) {
    await adminClient
      .from("contracts")
      .update({
        parsed_status: "error",
        error_message: "No milestone data found. Make sure you upload a digital (not scanned) PDF with a payment schedule or work stages.",
      })
      .eq("id", contract_id);
    return new Response(
      JSON.stringify({
        error: "No milestone data found. Make sure you upload a digital (not scanned) PDF with a payment schedule or work stages.",
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 9. Deterministic audit — code, not LLM
  const flags = auditMilestones(milestones, projectType);
  const parsed_result = { milestones, flags };

  // 10. Update contracts row to review state
  await adminClient
    .from("contracts")
    .update({ parsed_status: "review", parsed_result })
    .eq("id", contract_id);

  return new Response(
    JSON.stringify(parsed_result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
