import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCreateMilestone } from "@/hooks/useSupabaseProject";
import { milestoneTemplates } from "@/data/milestoneTemplates";
import { toast } from "sonner";

export default function TemplateSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentProjectId } = useProjectContext();
  const createMilestone = useCreateMilestone();

  const selectedTemplate = milestoneTemplates.find((t) => t.id === selected);

  const handleConfirm = async () => {
    if (!selectedTemplate || !currentProjectId) return;
    setLoading(true);
    try {
      for (const m of selectedTemplate.milestones) {
        await createMilestone.mutateAsync({
          project_id: currentProjectId,
          name: m.name,
          position: m.position,
          created_from: "template" as const,
          checklist: m.checklist,
        });
      }
      toast.success(`${selectedTemplate.milestones.length} milestones created`);
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Template load failed:", err);
      toast.error("Failed to create milestones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-6">choose a template</h1>

      <div className="flex-1 space-y-3">
        {milestoneTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`w-full text-left p-4 border transition-colors ${
              selected === t.id ? "border-accent border-l-4" : "border-border"
            }`}
          >
            <p className="font-sans text-[15px] text-foreground">{t.name}</p>
            <p className="font-mono text-[12px] text-muted-foreground mt-1">
              {t.milestones.length} milestones · {t.milestones.reduce((s, m) => s + m.checklist.length, 0)} checklist items
            </p>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="mt-4 mb-4 max-h-[200px] overflow-y-auto border border-border p-4">
          <p className="font-mono text-[10px] text-muted-foreground mb-3">preview</p>
          {selectedTemplate.milestones.map((m) => (
            <div key={m.position} className="mb-3">
              <p className="font-sans text-[13px] text-foreground">
                <span className="font-mono text-muted-foreground mr-2">{String(m.position).padStart(2, "0")}</span>
                {m.name}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground ml-6">
                {m.checklist.length} items: {m.checklist.slice(0, 2).join(", ")}{m.checklist.length > 2 ? "…" : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="dark"
        size="full"
        disabled={!selected || loading}
        onClick={handleConfirm}
      >
        <span className="font-sans text-[16px]">{loading ? "creating…" : "use this template"}</span>
      </Button>
    </div>
  );
}
