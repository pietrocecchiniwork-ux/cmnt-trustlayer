import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCreateProject, useAddProjectMember } from "@/hooks/useSupabaseProject";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "contractor" | "trade" | "client";

interface InlineTeamMember {
  name: string;
  role: Role;
  phone: string;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const createProject = useCreateProject();
  const addMember = useAddProjectMember();
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
  const [createdProject, setCreatedProject] = useState<{ id: string; code: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<InlineTeamMember[]>([
    { name: "", role: "contractor", phone: "" },
  ]);
  const [savingTeam, setSavingTeam] = useState(false);

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
      const { data: proj } = await supabase
        .from("projects")
        .select("project_code")
        .eq("id", result.id)
        .single();
      setCreatedProject({ id: result.id, code: proj?.project_code ?? "" });
      setStep(3);
    } catch (err) {
      console.error("Create project failed:", err);
      toast.error("Failed to create project");
    }
  };

  const handleSaveTeam = async () => {
    if (!createdProject) return;
    const validMembers = teamMembers.filter((m) => m.name.trim());
    if (validMembers.length === 0) {
      setStep(4);
      return;
    }
    setSavingTeam(true);
    try {
      for (const m of validMembers) {
        await addMember.mutateAsync({
          project_id: createdProject.id,
          name: m.name.trim(),
          role: m.role,
          phone_number: m.phone.trim() || null,
          email: null,
          status: "invited" as const,
        });
      }
      toast.success(`${validMembers.length} member(s) added`);
      setStep(4);
    } catch (err) {
      console.error("Add team failed:", err);
      toast.error("Failed to add team members");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleContinue = () => {
    if (formData.milestoneMethod === "upload") {
      navigate("/document-upload");
    } else if (formData.milestoneMethod === "template") {
      navigate("/template-select");
    } else if (formData.milestoneMethod === "manual") {
      navigate("/manual-milestone");
    } else {
      navigate("/project/dashboard");
    }
  };

  const handleCopyCode = async () => {
    const c = createdProject?.code;
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c);
      toast.success("code copied");
    } catch {
      toast.error("failed to copy");
    }
  };

  const addTeamRow = () => {
    setTeamMembers([...teamMembers, { name: "", role: "contractor", phone: "" }]);
  };

  const updateTeamMember = (index: number, field: keyof InlineTeamMember, value: string) => {
    setTeamMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeTeamRow = (index: number) => {
    if (teamMembers.length <= 1) return;
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const canAdvance = () => {
    if (step === 1) return formData.name.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return formData.milestoneMethod !== "";
    return false;
  };

  const totalSteps = 4;

  const roles: { key: Role; label: string }[] = [
    { key: "contractor", label: "contractor" },
    { key: "trade", label: "trade" },
    { key: "client", label: "client" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate("/"))}
          className="font-mono text-[13px] text-muted-foreground"
        >
          ← back
        </button>
        <span className="font-mono text-[13px] text-muted-foreground">
          {step} / {totalSteps}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* STEP 1 — PROJECT BASICS */}
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

        {/* STEP 2 — DATES & BUDGET */}
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

        {/* STEP 3 — TEAM */}
        {step === 3 && createdProject && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-2">add your team</h1>

            <div className="flex flex-col items-center py-6 border border-border mb-8">
              <p className="font-mono text-[10px] text-muted-foreground mb-2 tracking-widest uppercase">
                your project code
              </p>
              <p className="font-mono text-[18px] text-foreground tracking-wider leading-none break-all">
                {createdProject.code || "generating…"}
              </p>
              <button
                onClick={handleCopyCode}
                className="mt-3 font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5"
              >
                copy code
              </button>
              <p className="font-mono text-[11px] text-muted-foreground mt-2">
                share this code with your team
              </p>
            </div>

            <div className="space-y-6">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] text-muted-foreground tracking-widest uppercase">
                      member {idx + 1}
                    </p>
                    {teamMembers.length > 1 && (
                      <button
                        onClick={() => removeTeamRow(idx)}
                        className="font-mono text-[11px] text-destructive"
                      >
                        remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="name"
                    value={member.name}
                    onChange={(e) => updateTeamMember(idx, "name", e.target.value)}
                    className="underline-input"
                  />
                  <div className="flex border-b border-border">
                    {roles.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => updateTeamMember(idx, "role", r.key)}
                        className={`flex-1 py-3 font-mono text-[12px] text-center transition-colors ${
                          member.role === r.key
                            ? "text-accent border-b-2 border-accent"
                            : "text-muted-foreground"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="tel"
                    placeholder="phone (optional)"
                    value={member.phone}
                    onChange={(e) => updateTeamMember(idx, "phone", e.target.value)}
                    className="underline-input"
                  />
                </div>
              ))}

              <button
                onClick={addTeamRow}
                className="font-mono text-[13px] text-accent border-b border-accent/40 pb-0.5"
              >
                + add member
              </button>
            </div>
          </>
        )}

        {/* STEP 4 — MILESTONE SETUP */}
        {step === 4 && (
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

      {/* BOTTOM BUTTONS */}
      {step === 1 && (
        <Button
          variant="dark"
          size="full"
          disabled={!canAdvance()}
          onClick={() => setStep(2)}
        >
          <span className="font-sans text-[16px]">next</span>
        </Button>
      )}

      {step === 2 && (
        <Button
          variant="dark"
          size="full"
          disabled={createProject.isPending}
          onClick={handleCreate}
        >
          <span className="font-sans text-[16px]">
            {createProject.isPending ? "creating..." : "create project"}
          </span>
        </Button>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <Button
            variant="dark"
            size="full"
            disabled={savingTeam}
            onClick={handleSaveTeam}
          >
            <span className="font-sans text-[16px]">
              {savingTeam ? "saving..." : "save & continue"}
            </span>
          </Button>
          <button
            onClick={() => setStep(4)}
            className="w-full font-mono text-[13px] text-muted-foreground text-center py-2"
          >
            skip for now
          </button>
        </div>
      )}

      {step === 4 && (
        <Button variant="dark" size="full" disabled={!canAdvance()} onClick={handleContinue}>
          <span className="font-sans text-[16px]">continue</span>
        </Button>
      )}
    </div>
  );
}
