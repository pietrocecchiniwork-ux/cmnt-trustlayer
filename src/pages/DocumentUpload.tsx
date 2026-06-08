import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCreateMilestone, useCreateChange, useCurrentUser, useMilestones, useProjectMembers } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

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
  project_type: string;
  missing_phases: MissingPhaseFlag[];
  evidence_required: EvidenceRequirement[];
  irreversible_warnings: IrreversibleWarning[];
}

interface EditableRow {
  name: string;
  payment_value: string;
  due_date: string;
  trade: string | null;
  description: string | null;
  phase_id: string | null;
  assigned_member_id: string;
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [state, setState] = useState<"upload" | "loading" | "extracted" | "error">("upload");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [flags, setFlags] = useState<ContractFlags | null>(null);
  const [saving, setSaving] = useState(false);

  const assignableMembers = members.filter((m) => m.user_id !== null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProjectId) return;

    setState("loading");
    setErrorMsg(null);
    setFileName(file.name);

    try {
      // 1. Upload file to private contracts bucket
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      // Temporary path using timestamp; contract row id will be the canonical path
      const tempId = crypto.randomUUID();
      const storagePath = `${currentProjectId}/${tempId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        setErrorMsg("Failed to upload file — please try again.");
        setState("error");
        return;
      }

      // 2. Insert contracts row
      const { data: contractRow, error: insertError } = await (supabase as any)
        .from("contracts")
        .insert({
          project_id: currentProjectId,
          file_name: file.name,
          file_path: storagePath,
          parsed_status: "uploaded",
          created_by: currentUser?.id ?? null,
        })
        .select("id")
        .single();

      if (insertError || !contractRow) {
        console.error("Contracts row insert failed:", insertError);
        setErrorMsg("Failed to register contract — please try again.");
        setState("error");
        return;
      }

      const contract_id: string = contractRow.id;
      setContractId(contract_id);

      // 3. Invoke edge function with contract_id
      const { data, error } = await supabase.functions.invoke("extract-milestones", {
        body: { contract_id },
      });

      if (error) {
        setErrorMsg((error as any)?.message ?? null);
        setState("error");
        return;
      }

      if (data && typeof data === "object" && !Array.isArray(data) && (data as any).error) {
        setErrorMsg((data as any).error);
        setState("error");
        return;
      }

      // Response shape: { milestones, flags }
      const response = data as { milestones?: ExtractedMilestone[]; flags?: ContractFlags };
      const extracted: ExtractedMilestone[] = Array.isArray(response?.milestones)
        ? response.milestones
        : [];

      if (extracted.length === 0) {
        setState("error");
        return;
      }

      setFlags(response?.flags ?? null);
      setRows(
        extracted.map((m) => ({
          name: m.name,
          payment_value: m.payment_value != null ? String(m.payment_value) : "",
          due_date: m.due_date ?? "",
          trade: m.trade,
          description: m.description,
          phase_id: m.phase_id ?? null,
          assigned_member_id: bestMemberMatch(m.trade, members),
        }))
      );
      setState("extracted");
    } catch (err) {
      console.error("Extraction failed:", err);
      setErrorMsg(null);
      setState("error");
    }
  };

  const updateRow = (i: number, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { name: "", payment_value: "", due_date: "", trade: null, description: null, phase_id: null, assigned_member_id: "" },
    ]);
  };

  const canConfirm = rows.length > 0 && rows.every((r) => r.name.trim() !== "" && r.due_date !== "" && r.assigned_member_id !== "");

  const handleConfirm = async () => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    setSaving(true);
    try {
      // 1. Insert milestones
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const member = assignableMembers.find((m) => m.id === r.assigned_member_id);
        const newMilestone = await createMilestone.mutateAsync({
          project_id: currentProjectId,
          name: r.name,
          due_date: r.due_date || null,
          payment_value: r.payment_value !== "" ? Number(r.payment_value) : null,
          description: r.description || null,
          position: existingMilestones.length + i + 1,
          created_from: "extracted" as const,
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
              phase_id: r.phase_id ?? null,
            },
          });
        } catch (e) {
          console.warn("Change log failed:", e);
        }
      }

      // 2. Mark contracts row as confirmed
      if (contractId) {
        try {
          await (supabase as any)
            .from("contracts")
            .update({ parsed_status: "confirmed" })
            .eq("id", contractId);
        } catch (e) {
          console.warn("Contracts status update failed:", e);
        }
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

  const inputCls =
    "bg-transparent border-0 border-b border-border outline-none font-sans text-[14px] text-foreground w-full";
  const monoInputCls =
    "bg-transparent border-0 border-b border-border outline-none font-mono text-[13px] text-muted-foreground w-full";

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-8">upload contract</h1>

      <div className="flex-1">
        {state === "upload" && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border border-dashed border-border flex flex-col items-center justify-center gap-2"
            >
              <p className="font-mono text-[13px] text-foreground">drop contract or JCT here</p>
              <p className="font-mono text-[11px] text-muted-foreground">pdf or image (jpg, png)</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        {state === "loading" && (
          <div className="flex items-center justify-center h-48">
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">reading document...</p>
          </div>
        )}

        {state === "extracted" && (
          <div className="space-y-6">
            {/* Flags panel */}
            {flags && (
              <div className="space-y-3">
                {flags.project_type && flags.project_type !== "unknown" && (
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    detected: {flags.project_type.replace(/_/g, " ")}
                  </p>
                )}

                {flags.missing_phases.length > 0 && (
                  <div className="bg-card rounded-2xl px-4 py-3 space-y-1.5">
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                      phases not in contract ({flags.missing_phases.length})
                    </p>
                    {flags.missing_phases.map((p) => (
                      <p key={p.phase_id} className="font-mono text-[11px] text-muted-foreground">
                        {p.phase_id} · {p.phase_name}
                      </p>
                    ))}
                  </div>
                )}

                {flags.irreversible_warnings.length > 0 && (
                  <div className="bg-card rounded-2xl px-4 py-3 space-y-2">
                    <p className="font-mono text-[10px] text-destructive uppercase tracking-widest">
                      evidence required before work is concealed
                    </p>
                    {flags.irreversible_warnings.map((w) => (
                      <div key={w.phase_id}>
                        <p className="font-mono text-[11px] text-foreground">{w.milestone_name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{w.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {flags.evidence_required.some((e) => e.evidence.some((ev) => ev.can_trigger_payment_release)) && (
                  <div className="bg-card rounded-2xl px-4 py-3 space-y-1.5">
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                      payment-triggering evidence required
                    </p>
                    {flags.evidence_required
                      .flatMap((e) =>
                        e.evidence
                          .filter((ev) => ev.can_trigger_payment_release)
                          .map((ev) => ({ milestone: e.milestone_name, ev }))
                      )
                      .slice(0, 6)
                      .map(({ milestone, ev }) => (
                        <p key={`${ev.evidence_id}-${milestone}`} className="font-mono text-[11px] text-muted-foreground">
                          {ev.evidence_name} · <span className="text-foreground">{milestone}</span>
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Milestone rows */}
            <div>
              <div className="grid grid-cols-[1fr_80px_100px_110px_24px] gap-2 pb-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted-foreground">milestone</span>
                <span className="font-mono text-[10px] text-muted-foreground">£ amount</span>
                <span className="font-mono text-[10px] text-muted-foreground">due date</span>
                <span className="font-mono text-[10px] text-muted-foreground">assignee <span className="text-destructive">*</span></span>
                <span />
              </div>

              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_100px_110px_24px] gap-2 items-center py-3 border-b border-border"
                >
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder="milestone name"
                      className={inputCls}
                    />
                    {r.phase_id && (
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{r.phase_id}</p>
                    )}
                  </div>
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
                      r.assigned_member_id ? "text-foreground border-border" : "text-destructive border-destructive/40"
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
              ))}

              <button
                onClick={addRow}
                className="mt-4 font-mono text-[11px] text-muted-foreground underline underline-offset-4"
              >
                + add milestone
              </button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center h-48 gap-6 text-center">
            <p className="font-mono text-[13px] text-muted-foreground">
              {errorMsg ?? "we couldn't read this document clearly — try a template or add manually"}
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
          <span className="font-sans text-[16px]">{saving ? "saving…" : "confirm milestones"}</span>
        </Button>
      )}
    </div>
  );
}
