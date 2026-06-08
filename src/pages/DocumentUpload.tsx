import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import {
  useCreateMilestone,
  useCreateChange,
  useCurrentUser,
  useMilestones,
  useProjectMembers,
} from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  getPaymentDocsForPhase,
  getCaptureWarningsForPhase,
  getSuggestedMissingPhases,
  type PaymentDocSuggestion,
  type CaptureWarning,
  type MissingPhaseSuggestion,
} from "@/data/ontology/payment-evidence";
import { getPhaseById } from "@/data/ontology";

interface ExtractedMilestone {
  name: string;
  due_date: string | null;
  payment_value: number | null;
  trade: string | null;
  description: string | null;
  phase_id: string | null;
}

interface ExtractionResponse {
  project_type: string | null;
  milestones: ExtractedMilestone[];
}

interface EditableRow {
  name: string;
  payment_value: string;
  due_date: string;
  trade: string | null;
  description: string | null;
  assigned_member_id: string;
  phase_id: string | null;
  source: "extracted" | "suggested" | "manual";
}

function bestMemberMatch(trade: string | null, members: Tables<"project_members">[]): string {
  if (!trade || members.length === 0) return "";
  const t = trade.toLowerCase();
  const byName = members.find(
    (m) => m.name.toLowerCase().includes(t) || t.includes(m.name.toLowerCase().split(" ")[0])
  );
  if (byName) return byName.id;
  const byRole = members.find((m) => m.role === "trade" || m.role === "contractor");
  return byRole?.id ?? "";
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const createMilestone = useCreateMilestone();
  const createChange = useCreateChange();
  const { data: currentUser } = useCurrentUser();
  const { data: existingMilestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: members = [] } = useProjectMembers(currentProjectId ?? undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<"upload" | "loading" | "extracted" | "error">("upload");
  const [filename, setFilename] = useState<string | null>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [rawPayload, setRawPayload] = useState<unknown>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [suggestions, setSuggestions] = useState<MissingPhaseSuggestion[]>([]);
  const [deferredPhaseIds, setDeferredPhaseIds] = useState<Set<string>>(new Set());
  const [confirmWarn, setConfirmWarn] = useState(false);
  const [saving, setSaving] = useState(false);

  const assignableMembers = members.filter((m) => m.user_id !== null);

  // Load any phases the PM previously deferred so we don't re-show them here.
  useEffect(() => {
    if (!currentProjectId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("milestone_suggestions")
        .select("phase_id")
        .eq("project_id", currentProjectId)
        .eq("status", "deferred");
      if (cancelled || error || !data) return;
      setDeferredPhaseIds(new Set((data as { phase_id: string }[]).map((r) => r.phase_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectId]);

  // ---------------------------------------------------------------- training signal
  const logSignal = async (args: {
    signal_type: string;
    entity_id: string | null;
    action: "accepted" | "dismissed" | "edited";
    context?: Record<string, unknown>;
  }) => {
    try {
      await supabase.from("ontology_training_signals").insert({
        project_id: currentProjectId ?? null,
        extraction_id: extractionId,
        signal_type: args.signal_type,
        entity_id: args.entity_id,
        action: args.action,
        context: (args.context ?? null) as never,
        user_id: currentUser?.id ?? null,
      } as never);
    } catch (e) {
      console.warn("training signal failed:", e);
    }
  };

  // ---------------------------------------------------------------- upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProjectId) return;

    setState("loading");
    setFilename(file.name);

    try {
      const base64 = await readFileAsBase64(file);
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";

      // Upload original file to private contracts bucket: {projectId}/{uuid}/{filename}
      let uploadedPath: string | null = null;
      try {
        const folderId = crypto.randomUUID();
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${currentProjectId}/${folderId}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("contracts")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) {
          console.warn("contract upload failed:", upErr);
        } else {
          uploadedPath = path;
        }
      } catch (e) {
        console.warn("contract upload threw:", e);
      }

      const { data, error } = await supabase.functions.invoke("extract-milestones", {
        body: { file_base64: base64, file_type: fileExt },
      });
      if (error) {
        const msg =
          (error as { message?: string })?.message ??
          "Failed to read document. If it's a scanned PDF, upload a digital (not scanned) PDF.";
        toast.error(msg);
        setState("error");
        return;
      }

      // Tolerate both old array shape and new object shape.
      const payload: ExtractionResponse = Array.isArray(data)
        ? { project_type: null, milestones: data as ExtractedMilestone[] }
        : (data as ExtractionResponse);

      const extracted = Array.isArray(payload.milestones) ? payload.milestones : [];
      if (extracted.length === 0) {
        toast.error(
          "We couldn't extract any milestones. If it's a scanned PDF, please upload a digital (text-based) PDF."
        );
        setState("error");
        return;
      }

      setProjectType(payload.project_type ?? null);
      setRawPayload(payload);

      // Persist parsed record so we can flip it to 'confirmed' on save.
      const { data: extraction } = await supabase
        .from("contract_extractions")
        .insert({
          project_id: currentProjectId,
          filename: file.name,
          file_path: uploadedPath,
          parsed_status: "parsed",
          project_type: payload.project_type ?? null,
          raw_payload: payload as never,
          created_by: currentUser?.id ?? null,
        } as never)
        .select("id")
        .single();
      if (extraction?.id) setExtractionId(extraction.id);

      const newRows: EditableRow[] = extracted.map((m) => ({
        name: m.name,
        payment_value: m.payment_value != null ? String(m.payment_value) : "",
        due_date: m.due_date ?? "",
        trade: m.trade,
        description: m.description,
        assigned_member_id: bestMemberMatch(m.trade, members),
        phase_id: m.phase_id ?? null,
        source: "extracted",
      }));
      setRows(newRows);

      const presentPhaseIds = newRows.map((r) => r.phase_id ?? "").filter(Boolean);
      const allSuggestions = getSuggestedMissingPhases(payload.project_type, presentPhaseIds);
      setSuggestions(allSuggestions.filter((s) => !deferredPhaseIds.has(s.phase.id)));

      setState("extracted");
    } catch (err) {
      console.error("Extraction failed:", err);
      setState("error");
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ---------------------------------------------------------------- row ops
  const updateRow = (i: number, patch: Partial<EditableRow>) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        // Mark edited rows so we capture training signal on confirm.
        if (r.source === "extracted" && (patch.name || patch.due_date || patch.payment_value)) {
          // no-op flag — we re-derive on confirm
        }
        return next;
      })
    );
  };

  const removeRow = (i: number) => {
    const removed = rows[i];
    if (removed?.source === "extracted") {
      logSignal({
        signal_type: "extracted_milestone",
        entity_id: removed.phase_id,
        action: "dismissed",
        context: { name: removed.name },
      });
    }
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        name: "",
        payment_value: "",
        due_date: "",
        trade: null,
        description: null,
        assigned_member_id: "",
        phase_id: null,
        source: "manual",
      },
    ]);
  };

  const acceptSuggestion = (s: MissingPhaseSuggestion) => {
    setRows((prev) => [
      ...prev,
      {
        name: s.phase.name,
        payment_value: "",
        due_date: "",
        trade: null,
        description: s.reason,
        assigned_member_id: "",
        phase_id: s.phase.id,
        source: "suggested",
      },
    ]);
    setSuggestions((prev) => prev.filter((x) => x.phase.id !== s.phase.id));
    logSignal({
      signal_type: "suggested_addition",
      entity_id: s.phase.id,
      action: "accepted",
      context: { project_type: projectType },
    });
  };

  const dismissSuggestion = (s: MissingPhaseSuggestion) => {
    setSuggestions((prev) => prev.filter((x) => x.phase.id !== s.phase.id));
    logSignal({
      signal_type: "suggested_addition",
      entity_id: s.phase.id,
      action: "dismissed",
      context: { project_type: projectType },
    });
  };

  const canConfirm =
    rows.length > 0 &&
    rows.every((r) => r.name.trim() !== "" && r.due_date !== "" && r.assigned_member_id !== "");

  // ---------------------------------------------------------------- confirm
  const handleConfirm = async () => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const member = assignableMembers.find((m) => m.id === r.assigned_member_id);
        const paymentDocs = getPaymentDocsForPhase(r.phase_id);
        const warnings = getCaptureWarningsForPhase(r.phase_id);

        // Stash advisory metadata in checklist jsonb so other screens can read it.
        const checklist = paymentDocs.map((d) => ({
          id: d.evidence_id,
          label: d.name,
          kind: "payment_evidence" as const,
          legal_weight: d.legal_weight,
          can_trigger_payment: d.can_trigger_payment,
          done: false,
          advisory: true,
        }));

        const newMilestone = await createMilestone.mutateAsync({
          project_id: currentProjectId,
          name: r.name,
          due_date: r.due_date || null,
          payment_value: r.payment_value !== "" ? Number(r.payment_value) : null,
          position: existingMilestones.length + i + 1,
          created_from: "extracted" as const,
          checklist,
          ...(member?.user_id && {
            assigned_to: member.user_id,
            assigned_to_name: member.name,
          }),
        });

        try {
          await createChange.mutateAsync({
            project_id: currentProjectId,
            entity_type: "milestone",
            entity_id: newMilestone.id,
            entity_name: r.name,
            change_type: "created",
            changed_by: currentUser?.id,
            changed_by_name: currentUser?.email ?? undefined,
            new_value: {
              name: r.name,
              due_date: r.due_date || null,
              payment_value: r.payment_value !== "" ? Number(r.payment_value) : null,
              assigned_to_name: member?.name ?? null,
              phase_id: r.phase_id,
              source: r.source,
              payment_docs_advisory: paymentDocs.map((d) => d.evidence_id),
              capture_warnings: warnings.map((w) => w.rule.successor),
            },
          });
        } catch (e) {
          console.warn("Change log failed:", e);
        }
      }

      // Mark the extraction confirmed.
      if (extractionId) {
        await supabase
          .from("contract_extractions")
          .update({ parsed_status: "confirmed", confirmed_at: new Date().toISOString() })
          .eq("id", extractionId);
      }

      toast.success("Milestones added");
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Failed to save milestones:", err);
      toast.error("Failed to save milestones");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------- render
  const inputCls =
    "bg-transparent border-0 border-b border-border outline-none font-sans text-[14px] text-foreground w-full";
  const monoInputCls =
    "bg-transparent border-0 border-b border-border outline-none font-mono text-[13px] text-muted-foreground w-full";

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button
        onClick={() => navigate(-1)}
        className="font-mono text-[13px] text-muted-foreground mb-8"
      >
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-2">upload contract</h1>
      {projectType && state === "extracted" && (
        <p className="font-mono text-[11px] text-muted-foreground mb-6">
          detected: {projectType.replace("_", " ")}
        </p>
      )}

      <div className="flex-1">
        {state === "upload" && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border border-dashed border-border flex flex-col items-center justify-center gap-2"
            >
              <p className="font-mono text-[13px] text-foreground">drop contract or JCT here</p>
              <p className="font-mono text-[11px] text-muted-foreground">pdf, doc, or image</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        {state === "loading" && (
          <div className="flex items-center justify-center h-48">
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">
              reading {filename ?? "document"}...
            </p>
          </div>
        )}

        {state === "extracted" && (
          <div className="space-y-8">
            {/* Suggested additions */}
            {suggestions.length > 0 && (
              <section>
                <h2 className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-3">
                  suggested additions ({suggestions.length})
                </h2>
                <p className="font-mono text-[11px] text-muted-foreground mb-3">
                  advisory only — confirm with your contract administrator
                </p>
                <ul className="space-y-2">
                  {suggestions.map((s) => (
                    <li
                      key={s.phase.id}
                      className="flex items-start justify-between gap-3 py-2 border-b border-border"
                    >
                      <div className="min-w-0">
                        <p className="font-sans text-[14px] text-foreground truncate">
                          {s.phase.name}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {s.phase.id} · {s.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => acceptSuggestion(s)}
                          className="font-mono text-[11px] text-foreground underline underline-offset-4"
                        >
                          accept
                        </button>
                        <button
                          onClick={() => dismissSuggestion(s)}
                          className="font-mono text-[11px] text-muted-foreground"
                        >
                          dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Milestones */}
            <section>
              <h2 className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-3">
                milestones ({rows.length})
              </h2>
              <div className="grid grid-cols-[1fr_80px_100px_110px_24px] gap-2 pb-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted-foreground">milestone</span>
                <span className="font-mono text-[10px] text-muted-foreground">£ amount</span>
                <span className="font-mono text-[10px] text-muted-foreground">due date</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  assignee <span className="text-destructive">*</span>
                </span>
                <span />
              </div>

              {rows.map((r, i) => {
                const docs = getPaymentDocsForPhase(r.phase_id);
                const warnings = getCaptureWarningsForPhase(r.phase_id);
                return (
                  <div key={i} className="py-3 border-b border-border">
                    <div className="grid grid-cols-[1fr_80px_100px_110px_24px] gap-2 items-center">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                        placeholder="milestone name"
                        className={inputCls}
                      />
                      <input
                        type="number"
                        value={r.payment_value}
                        onChange={(e) => updateRow(i, { payment_value: e.target.value })}
                        placeholder="0"
                        className={monoInputCls}
                      />
                      <input
                        type="date"
                        value={r.due_date}
                        onChange={(e) => updateRow(i, { due_date: e.target.value })}
                        className={monoInputCls}
                      />
                      <select
                        value={r.assigned_member_id}
                        onChange={(e) => updateRow(i, { assigned_member_id: e.target.value })}
                        className={`bg-transparent border-0 border-b outline-none font-mono text-[11px] w-full ${
                          r.assigned_member_id
                            ? "text-foreground border-border"
                            : "text-destructive border-destructive/40"
                        }`}
                      >
                        <option value="">— required —</option>
                        {assignableMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeRow(i)}
                        className="font-mono text-[11px] text-muted-foreground hover:text-foreground text-right"
                        aria-label="remove"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Phase tag */}
                    {r.phase_id && (
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {r.phase_id} · {getPhaseById(r.phase_id)?.name ?? "unknown phase"}
                        {r.source === "suggested" && " · suggested"}
                      </p>
                    )}

                    {/* Documents needed for payment */}
                    {docs.length > 0 && (
                      <div className="mt-2">
                        <p className="font-mono text-[10px] text-muted-foreground mb-1">
                          docs usually needed for payment (advisory)
                        </p>
                        <ul className="flex flex-wrap gap-1">
                          {docs.map((d) => (
                            <li
                              key={d.evidence_id}
                              className="font-mono text-[10px] text-foreground border border-border rounded-full px-2 py-0.5"
                              title={d.legal_weight}
                            >
                              {d.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Capture-before-covered warnings */}
                    {warnings.map((w) => (
                      <CaptureWarningRow
                        key={w.rule.successor}
                        warning={w}
                        onDismiss={() => {
                          logSignal({
                            signal_type: "capture_warning",
                            entity_id: r.phase_id,
                            action: "dismissed",
                            context: { successor: w.rule.successor, milestone_name: r.name },
                          });
                        }}
                        onAccept={() => {
                          logSignal({
                            signal_type: "capture_warning",
                            entity_id: r.phase_id,
                            action: "accepted",
                            context: { successor: w.rule.successor, milestone_name: r.name },
                          });
                        }}
                      />
                    ))}
                  </div>
                );
              })}

              <button
                onClick={addRow}
                className="mt-4 font-mono text-[11px] text-muted-foreground underline underline-offset-4"
              >
                + add milestone
              </button>
            </section>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center h-48 gap-6 text-center">
            <p className="font-mono text-[13px] text-muted-foreground">
              we couldn't read this document clearly — try a template or add manually
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate("/project/template-select")}
                className="font-mono text-[13px] text-foreground underline underline-offset-4"
              >
                use a template
              </button>
              <button
                onClick={() => navigate("/project/manual-milestone")}
                className="font-mono text-[13px] text-foreground underline underline-offset-4"
              >
                add manually
              </button>
            </div>
          </div>
        )}
      </div>

      {state === "extracted" && (
        <Button variant="dark" size="full" onClick={handleConfirm} disabled={saving || !canConfirm}>
          <span className="font-sans text-[16px]">
            {saving ? "saving…" : "confirm milestones"}
          </span>
        </Button>
      )}
    </div>
  );
}

function CaptureWarningRow({
  warning,
  onDismiss,
  onAccept,
}: {
  warning: CaptureWarning;
  onDismiss: () => void;
  onAccept: () => void;
}) {
  const [resolved, setResolved] = useState<"accepted" | "dismissed" | null>(null);
  if (resolved) {
    return (
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        warning {resolved} · {warning.rule.successor}
      </p>
    );
  }
  return (
    <div className="mt-2 border border-warning/40 bg-warning/5 rounded-md p-2">
      <p className="font-mono text-[10px] uppercase text-warning tracking-wide mb-1">
        capture before it's covered
      </p>
      <p className="font-sans text-[12px] text-foreground leading-snug">{warning.message}</p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        advisory — confirm with your CA
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={() => {
            onAccept();
            setResolved("accepted");
          }}
          className="font-mono text-[11px] text-foreground underline underline-offset-4"
        >
          got it
        </button>
        <button
          onClick={() => {
            onDismiss();
            setResolved("dismissed");
          }}
          className="font-mono text-[11px] text-muted-foreground"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}
