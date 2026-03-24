import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCreateMilestone, useMilestones, useProjectMembers } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

interface ExtractedMilestone {
  name: string;
  due_date: string | null;
  payment_value: number | null;
  trade: string | null;
  description: string | null;
}

interface EditableRow {
  name: string;
  payment_value: string;
  due_date: string;
  trade: string | null;
  description: string | null;
  assigned_member_id: string;
}

function bestMemberMatch(trade: string | null, members: Tables<"project_members">[]): string {
  if (!trade || members.length === 0) return "";
  const t = trade.toLowerCase();
  // Name-first: member whose name contains the trade word
  const byName = members.find(
    (m) => m.name.toLowerCase().includes(t) || t.includes(m.name.toLowerCase().split(" ")[0])
  );
  if (byName) return byName.id;
  // Role fallback: trades map to "trade" or "contractor" roles
  const byRole = members.find((m) => m.role === "trade" || m.role === "contractor");
  return byRole?.id ?? "";
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const createMilestone = useCreateMilestone();
  const { data: existingMilestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: members = [] } = useProjectMembers(currentProjectId ?? undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"upload" | "loading" | "extracted" | "error">("upload");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState("loading");

    try {
      const base64 = await readFileAsBase64(file);
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";

      const { data, error } = await supabase.functions.invoke("extract-milestones", {
        body: { file_base64: base64, file_type: fileExt },
      });

      if (error) throw error;

      const extracted: ExtractedMilestone[] = Array.isArray(data) ? data : [];
      if (extracted.length === 0) {
        setState("error");
        return;
      }

      setRows(
        extracted.map((m) => ({
          name: m.name,
          payment_value: m.payment_value != null ? String(m.payment_value) : "",
          due_date: m.due_date ?? "",
          trade: m.trade,
          description: m.description,
          assigned_member_id: bestMemberMatch(m.trade, members),
        }))
      );
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
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const updateRow = (i: number, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { name: "", payment_value: "", due_date: "", trade: null, description: null, assigned_member_id: "" },
    ]);
  };

  const canConfirm = rows.length > 0 && rows.every((r) => r.name.trim() !== "" && r.due_date !== "");

  const handleConfirm = async () => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        await createMilestone.mutateAsync({
          project_id: currentProjectId,
          name: r.name,
          due_date: r.due_date || null,
          payment_value: r.payment_value !== "" ? Number(r.payment_value) : null,
          position: existingMilestones.length + i + 1,
          created_from: "extracted" as const,
        });
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
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">reading document...</p>
          </div>
        )}

        {state === "extracted" && (
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_80px_100px_110px_24px] gap-2 pb-2 border-b border-border">
              <span className="font-mono text-[10px] text-muted-foreground">milestone</span>
              <span className="font-mono text-[10px] text-muted-foreground">£ amount</span>
              <span className="font-mono text-[10px] text-muted-foreground">due date</span>
              <span className="font-mono text-[10px] text-muted-foreground">assignee</span>
              <span />
            </div>

            {rows.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_100px_110px_24px] gap-2 items-center py-3 border-b border-border"
              >
                {/* Name */}
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="milestone name"
                  className={inputCls}
                />

                {/* Payment value */}
                <input
                  type="number"
                  value={r.payment_value}
                  onChange={(e) => updateRow(i, { payment_value: e.target.value })}
                  placeholder="0"
                  className={monoInputCls}
                />

                {/* Due date */}
                <input
                  type="date"
                  value={r.due_date}
                  onChange={(e) => updateRow(i, { due_date: e.target.value })}
                  className={monoInputCls}
                />

                {/* Assignee */}
                <select
                  value={r.assigned_member_id}
                  onChange={(e) => updateRow(i, { assigned_member_id: e.target.value })}
                  className="bg-transparent border-0 border-b border-border outline-none font-mono text-[11px] text-muted-foreground w-full"
                >
                  <option value="">unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                {/* Remove */}
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
          <span className="font-sans text-[16px]">{saving ? "saving…" : "confirm milestones"}</span>
        </Button>
      )}
    </div>
  );
}
