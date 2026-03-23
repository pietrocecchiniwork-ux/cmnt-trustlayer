import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCreateMilestone, useMilestones } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractedMilestone {
  name: string;
  due_date: string | null;
  payment_value: number | null;
  trade: string | null;
  description: string | null;
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const createMilestone = useCreateMilestone();
  const { data: existingMilestones = [] } = useMilestones(currentProjectId ?? undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"upload" | "loading" | "extracted" | "error">("upload");
  const [milestones, setMilestones] = useState<ExtractedMilestone[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState("loading");

    try {
      const base64 = await readFileAsBase64(file);
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileType = fileExt;

      const { data, error } = await supabase.functions.invoke("extract-milestones", {
        body: { file_base64: base64, file_type: fileType },
      });

      if (error) throw error;

      const extracted: ExtractedMilestone[] = Array.isArray(data) ? data : [];
      if (extracted.length === 0) {
        setState("error");
        return;
      }

      setMilestones(extracted);
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
        // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleConfirm = async () => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        await createMilestone.mutateAsync({
          project_id: currentProjectId,
          name: m.name,
          due_date: m.due_date ?? null,
          payment_value: m.payment_value ?? 0,
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
          <div className="space-y-0">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                <span className="font-sans text-[14px] text-foreground">{m.name}</span>
                <span className="font-mono text-[13px] text-muted-foreground">
                  {m.payment_value != null ? `£${m.payment_value.toLocaleString()}` : "—"}
                </span>
              </div>
            ))}
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
        <Button variant="dark" size="full" onClick={handleConfirm} disabled={saving}>
          <span className="font-sans text-[16px]">{saving ? "saving…" : "confirm milestones"}</span>
        </Button>
      )}
    </div>
  );
}
