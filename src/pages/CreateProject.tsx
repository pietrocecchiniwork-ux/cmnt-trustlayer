import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "@/hooks/useSupabaseProject";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { toast } from "sonner";

export default function CreateProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const createProject = useCreateProject();
  const { setCurrentProjectId } = useProjectContext();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    startDate: "",
    endDate: "",
    totalBudget: "",
    paymentMode: false,
    milestoneMethod: "" as "" | "upload" | "template" | "manual",
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    try {
      const result = await createProject.mutateAsync({
        name: formData.name,
        address: formData.address || null,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        payment_mode: formData.paymentMode,
        total_budget: formData.totalBudget ? Number(formData.totalBudget) : null,
      });
      setCurrentProjectId(result.id);
      toast.success("Project created");

      // Navigate based on milestone method
      if (formData.milestoneMethod === "upload") {
        navigate("/document-upload");
      } else if (formData.milestoneMethod === "template") {
        navigate("/template-select");
      } else if (formData.milestoneMethod === "manual") {
        navigate("/manual-milestone");
      } else {
        navigate("/project/dashboard");
      }
    } catch (err) {
      console.error("Create project failed:", err);
      toast.error("Failed to create project");
    }
  };

  const canAdvance = () => {
    if (step === 1) return formData.name.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return formData.milestoneMethod !== "";
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate("/"))}
          className="font-mono text-[13px] text-muted-foreground"
        >
          ← back
        </button>
        <span className="font-mono text-[13px] text-muted-foreground">{step} / 3</span>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-8">new project</h1>
            <div className="space-y-6">
              <input
                type="text"
                placeholder="project name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="underline-input"
              />
              <input
                type="text"
                placeholder="address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="underline-input"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-8">dates &amp; budget</h1>
            <div className="space-y-6">
              <input
                type="date"
                placeholder="start date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="underline-input"
              />
              <input
                type="date"
                placeholder="end date"
                value={formData.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                className="underline-input"
              />
              <input
                type="number"
                placeholder="total budget (£)"
                value={formData.totalBudget}
                onChange={(e) => updateField("totalBudget", e.target.value)}
                className="underline-input"
              />
              <div className="flex items-center justify-between py-4">
                <div className="flex-1 pr-4">
                  <p className="font-sans text-[16px] text-foreground">
                    release payments on milestone completion
                  </p>
                  <p className="font-mono text-[12px] text-muted-foreground mt-1">
                    certificates generated automatically
                  </p>
                </div>
                <button
                  onClick={() => updateField("paymentMode", !formData.paymentMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    formData.paymentMode ? "bg-accent" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-background rounded-full transition-transform ${
                      formData.paymentMode ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-2">milestone setup</h1>
            <p className="font-sans text-[14px] text-muted-foreground mb-8">
              how do you want to add milestones?
            </p>
            <div className="space-y-3">
              {([
                { key: "upload" as const, label: "upload contract", desc: "extract milestones from a PDF or document" },
                { key: "template" as const, label: "use template", desc: "start from a pre-built milestone template" },
                { key: "manual" as const, label: "add manually", desc: "type in milestones one by one" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => updateField("milestoneMethod", opt.key)}
                  className={`w-full text-left p-4 border transition-colors ${
                    formData.milestoneMethod === opt.key
                      ? "border-foreground bg-foreground/5"
                      : "border-border"
                  }`}
                >
                  <p className="font-sans text-[16px] text-foreground">{opt.label}</p>
                  <p className="font-mono text-[12px] text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Button
        variant="dark"
        size="full"
        disabled={!canAdvance() || createProject.isPending}
        onClick={() => {
          if (step < 3) setStep(step + 1);
          else handleCreate();
        }}
      >
        <span className="font-sans text-[16px]">
          {step < 3 ? "next" : createProject.isPending ? "creating..." : "create project"}
        </span>
      </Button>
    </div>
  );
}
