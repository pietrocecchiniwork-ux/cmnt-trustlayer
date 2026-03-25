import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCreateMilestone, useCreateTask, useCreateChange, useCurrentUser, useMilestones, useProjectMembers } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskDraft {
  name: string;
  assigneeId: string;
  budget: string;
}

export default function ManualMilestone() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const createMilestone = useCreateMilestone();
  const createTask = useCreateTask();
  const createChange = useCreateChange();
  const { data: currentUser } = useCurrentUser();
  const { data: existingMilestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: members = [], isLoading: membersLoading } = useProjectMembers(currentProjectId ?? undefined);
  const [formData, setFormData] = useState({
    name: "",
    dueDate: "",
    paymentValue: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([{ name: "", assigneeId: "", budget: "" }]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Only members who have joined (user_id present) can be assigned
  const assignableMembers = members.filter((m) => m.user_id !== null);

  const addTaskDraft = () => setTaskDrafts((prev) => [...prev, { name: "", assigneeId: "", budget: "" }]);
  const updateTaskDraft = (i: number, field: keyof TaskDraft, val: string) =>
    setTaskDrafts((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  const removeTaskDraft = (i: number) =>
    setTaskDrafts((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async (addAnother: boolean) => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Milestone name is required");
      return;
    }
    if (!selectedMemberId) {
      toast.error("Please assign this milestone to a team member");
      return;
    }

    const selectedMember = assignableMembers.find((m) => m.id === selectedMemberId);

    try {
      const newMilestone = await createMilestone.mutateAsync({
        project_id: currentProjectId,
        name: formData.name,
        due_date: formData.dueDate || null,
        payment_value: formData.paymentValue ? Number(formData.paymentValue) : 0,
        position: existingMilestones.length + 1,
        created_from: "manual" as const,
        checklist: [],
        ...(selectedMember?.user_id && {
          assigned_to: selectedMember.user_id,
          assigned_to_name: selectedMember.name,
        }),
      });

      // Create task records for each non-empty task draft
      const validTasks = taskDrafts.filter((t) => t.name.trim());
      await Promise.all(
        validTasks.map((t, i) => {
          const assignee = assignableMembers.find((m) => m.id === t.assigneeId);
          return createTask.mutateAsync({
            milestone_id: newMilestone.id,
            name: t.name.trim(),
            position: i + 1,
            evidence_required: true,
            ...(assignee?.user_id && { assigned_to: assignee.user_id, assigned_to_name: assignee.name, assigned_role: assignee.role }),
            ...(t.budget && { budget: Number(t.budget) }),
          });
        })
      );

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

      // Log change
      try {
        await createChange.mutateAsync({
          project_id: currentProjectId,
          entity_type: "milestone",
          entity_id: newMilestone.id,
          entity_name: formData.name,
          change_type: "created",
          changed_by: currentUser?.id,
          changed_by_name: currentUser?.email ?? undefined,
          new_value: {
            name: formData.name,
            due_date: formData.dueDate || null,
            payment_value: formData.paymentValue ? Number(formData.paymentValue) : 0,
            assigned_to_name: selectedMember?.name ?? null,
          },
        });
      } catch (e) {
        console.warn("Change log failed:", e);
      }

      toast.success("Milestone saved");
      if (addAnother) {
        setFormData({ name: "", dueDate: "", paymentValue: "" });
        setSelectedMemberId("");
        setTaskDrafts([{ name: "", assigneeId: "", budget: "" }]);
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
          <p className="font-mono text-[10px] text-muted-foreground mb-2">assign to <span className="text-destructive">*</span></p>
          {membersLoading ? (
            <select disabled className="underline-input text-muted-foreground font-mono text-[13px] bg-transparent w-full">
              <option>loading team...</option>
            </select>
          ) : assignableMembers.length === 0 ? (
            <p className="font-sans text-[13px] text-muted-foreground border-b border-border py-2">
              no team members yet — you will be assigned as PM.{" "}
              <button
                type="button"
                onClick={() => navigate("/project/team")}
                className="text-accent underline underline-offset-4"
              >
                invite team
              </button>
            </p>
          ) : (
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="underline-input font-mono text-[13px] bg-transparent w-full"
            >
              <option value="">— select assignee —</option>
              {assignableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-3">tasks</p>
          <div className="space-y-4">
            {taskDrafts.map((task, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`task ${i + 1}`}
                    value={task.name}
                    onChange={(e) => updateTaskDraft(i, "name", e.target.value)}
                    className="underline-input flex-1"
                  />
                  {taskDrafts.length > 1 && (
                    <button onClick={() => removeTaskDraft(i)} className="font-mono text-[14px] text-destructive">×</button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={task.assigneeId}
                    onChange={(e) => updateTaskDraft(i, "assigneeId", e.target.value)}
                    className="flex-1 bg-transparent border-b border-border font-mono text-[12px] text-foreground py-1"
                  >
                    <option value="">— assign to —</option>
                    {assignableMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 w-24">
                    <span className="font-mono text-[12px] text-muted-foreground">£</span>
                    <input
                      type="number"
                      placeholder="budget"
                      value={task.budget}
                      onChange={(e) => updateTaskDraft(i, "budget", e.target.value)}
                      className="flex-1 bg-transparent border-b border-border font-mono text-[12px] text-foreground py-1 w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addTaskDraft} className="font-mono text-[12px] text-accent mt-3">+ add task</button>
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
