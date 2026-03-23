import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCreateMilestone, useMilestones, useProjectMembers } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ManualMilestone() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const createMilestone = useCreateMilestone();
  const { data: existingMilestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: members = [], isLoading: membersLoading } = useProjectMembers(currentProjectId ?? undefined);
  const [formData, setFormData] = useState({
    name: "",
    dueDate: "",
    paymentValue: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Only members who have joined (user_id present) can be assigned
  const assignableMembers = members.filter((m) => m.user_id !== null);

  const addChecklistItem = () => setChecklistItems((prev) => [...prev, ""]);
  const updateChecklistItem = (i: number, val: string) =>
    setChecklistItems((prev) => prev.map((item, idx) => (idx === i ? val : item)));
  const removeChecklistItem = (i: number) =>
    setChecklistItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async (addAnother: boolean) => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Milestone name is required");
      return;
    }
    const checklist = checklistItems.map((s) => s.trim()).filter(Boolean);
    try {
      const newMilestone = await createMilestone.mutateAsync({
        project_id: currentProjectId,
        name: formData.name,
        due_date: formData.dueDate || null,
        payment_value: formData.paymentValue ? Number(formData.paymentValue) : 0,
        position: existingMilestones.length + 1,
        created_from: "manual" as const,
        checklist,
      });

      const selectedMember = assignableMembers.find((m) => m.id === selectedMemberId);
      if (selectedMember?.user_id) {
        const { error: assignErr } = await supabase
          .from("milestone_assignments")
          .insert({
            milestone_id: newMilestone.id,
            user_id: selectedMember.user_id,
            role: selectedMember.role,
          });
        if (assignErr) console.error("milestone_assignments insert error:", assignErr);
      }

      toast.success("Milestone saved");
      if (addAnother) {
        setFormData({ name: "", dueDate: "", paymentValue: "" });
        setSelectedMemberId("");
        setChecklistItems([""]);
      } else {
        navigate("/project/dashboard");
      }
    } catch (err) {
      console.error("Save milestone failed:", err);
      toast.error("Failed to save milestone");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">← back</button>
      <h1 className="font-sans text-[22px] text-foreground mb-8">add milestone</h1>

      <div className="flex-1 space-y-6 overflow-y-auto">
        <input type="text" placeholder="milestone name" value={formData.name} onChange={(e) => updateField("name", e.target.value)} className="underline-input" />
        <input type="date" placeholder="due date" value={formData.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} className="underline-input" />
        <div className="relative">
          <span className="absolute left-0 top-3 font-mono text-[16px] text-muted-foreground">£</span>
          <input type="number" placeholder="payment value" value={formData.paymentValue} onChange={(e) => updateField("paymentValue", e.target.value)} className="underline-input pl-4" />
        </div>

        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-2">assign to</p>
          {membersLoading ? (
            <select disabled className="underline-input text-muted-foreground font-mono text-[13px] bg-transparent w-full">
              <option>loading team...</option>
            </select>
          ) : assignableMembers.length === 0 ? (
            <p className="font-sans text-[13px] text-muted-foreground border-b border-border py-2">
              invite team members first —{" "}
              <button
                type="button"
                onClick={() => navigate("/project/team")}
                className="text-accent underline underline-offset-4"
              >
                go to team
              </button>
            </p>
          ) : (
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="underline-input font-mono text-[13px] bg-transparent w-full"
            >
              <option value="">— none —</option>
              {assignableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-3">evidence checklist</p>
          <div className="space-y-2">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`item ${i + 1}`}
                  value={item}
                  onChange={(e) => updateChecklistItem(i, e.target.value)}
                  className="underline-input flex-1"
                />
                {checklistItems.length > 1 && (
                  <button onClick={() => removeChecklistItem(i)} className="font-mono text-[14px] text-destructive">×</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addChecklistItem} className="font-mono text-[12px] text-accent mt-2">+ add item</button>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <Button variant="dark" size="full" onClick={() => handleSave(false)} disabled={createMilestone.isPending}>
          <span className="font-sans text-[16px]">{createMilestone.isPending ? "saving…" : "save milestone"}</span>
        </Button>
        <Button variant="outline" size="full" onClick={() => handleSave(true)} disabled={createMilestone.isPending}>
          <span className="font-sans text-[16px]">save and add another</span>
        </Button>
      </div>
    </div>
  );
}
