import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import {
  useTask,
  useTasks,
  useMilestones,
  useProjectMembers,
  useUpdateTask,
  useCreateChange,
  useCurrentUser,
  useTaskChanges,
} from "@/hooks/useSupabaseProject";
import type { ProjectChange } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

const statusPillClass: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  in_progress: "bg-accent/10 text-accent",
  complete: "bg-success/10 text-success",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const time = format(d, "HH:mm");
  if (isToday(d)) return `today ${time}`;
  if (isYesterday(d)) return `yesterday ${time}`;
  return `${format(d, "d MMM")} ${time}`;
}

function describeChange(c: ProjectChange) {
  const who = c.changed_by_name ?? "someone";
  switch (c.change_type) {
    case "created": return `task created by ${who}`;
    case "assigned": {
      const to = (c.new_value?.name as string) ?? "someone";
      return `assigned to ${to} by ${who}`;
    }
    case "updated": {
      const oldS = c.old_value?.status as string | undefined;
      const newS = c.new_value?.status as string | undefined;
      if (oldS && newS)
        return `status changed from ${oldS.replace("_", " ")} to ${newS.replace("_", " ")} by ${who}`;
      return `updated by ${who}`;
    }
    default: return `${c.change_type} by ${who}`;
  }
}

const entityDot: Record<string, string> = {
  task: "bg-accent",
  milestone: "bg-success",
  member: "bg-muted-foreground",
  evidence: "bg-accent",
  payment: "bg-success",
  project: "bg-muted-foreground",
};

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { role } = useRole();
  const { data: currentUser } = useCurrentUser();

  const { data: task, refetch: refetchTask } = useTask(taskId);
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: members = [] } = useProjectMembers(currentProjectId ?? undefined);
  const { data: changes = [] } = useTaskChanges(taskId);

  // Sibling tasks (for depends_on dropdown and dependency check)
  const { data: siblingTasks = [] } = useTasks(task?.milestone_id);

  const updateTask = useUpdateTask();
  const createChange = useCreateChange();

  const [reassigning, setReassigning] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  // ─── Edit state ───
  const [editing, setEditing] = useState(false);
  const [editDueDate, setEditDueDate] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDependsOn, setEditDependsOn] = useState("");

  if (!task) {
    return (
      <div className="flex flex-col bg-background px-6 pt-12">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">← back</button>
        <p className="font-mono text-[12px] text-muted-foreground">loading…</p>
      </div>
    );
  }

  const milestone = milestones.find((m) => m.id === task.milestone_id);
  const isAssignedUser = currentUser?.id === task.assigned_to;
  const isPM = role === "pm";

  // ─── Dependency check ───
  const dependsOnTask = task.depends_on
    ? siblingTasks.find((t) => t.id === task.depends_on)
    : null;
  const isBlocked = !!dependsOnTask && dependsOnTask.status !== "complete";

  const startEdit = () => {
    setEditDueDate(task.due_date ?? "");
    setEditBudget(task.budget != null ? String(task.budget) : "");
    setEditDependsOn(task.depends_on ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        milestoneId: task.milestone_id,
        due_date: editDueDate || undefined,
        budget: editBudget ? Number(editBudget) : undefined,
        depends_on: editDependsOn || null,
      });
      setEditing(false);
      refetchTask();
      toast.success("task updated");
    } catch {
      toast.error("failed to save");
    }
  };

  const handleAssign = async (memberId: string) => {
    const member = members.find((m) => m.user_id === memberId);
    if (!member || !currentProjectId) return;
    const oldAssignee = task.assigned_to_name;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        milestoneId: task.milestone_id,
        assigned_to: member.user_id,
        assigned_to_name: member.name,
      });
      await createChange.mutateAsync({
        project_id: currentProjectId,
        entity_type: "task",
        entity_id: task.id,
        entity_name: task.name,
        change_type: "assigned",
        changed_by: currentUser?.id,
        changed_by_name: currentUser?.email ?? undefined,
        old_value: oldAssignee ? { name: oldAssignee } : undefined,
        new_value: { name: member.name },
      });
      setReassigning(false);
      refetchTask();
      toast.success(`assigned to ${member.name}`);
    } catch {
      toast.error("failed to assign");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentProjectId) return;
    if (newStatus === "in_progress" && isBlocked) {
      toast.error(`waiting for "${dependsOnTask!.name}" to complete first`);
      return;
    }
    const oldStatus = task.status;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        milestoneId: task.milestone_id,
        status: newStatus,
        ...(newStatus === "complete" && {
          completed_at: new Date().toISOString(),
          completed_by: currentUser?.id,
        }),
      });
      await createChange.mutateAsync({
        project_id: currentProjectId,
        entity_type: "task",
        entity_id: task.id,
        entity_name: task.name,
        change_type: "updated",
        changed_by: currentUser?.id,
        changed_by_name: currentUser?.email ?? undefined,
        old_value: { status: oldStatus },
        new_value: { status: newStatus },
      });
      refetchTask();
      toast.success(`status updated to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("failed to update status");
    }
  };

  const handleSubmitEvidence = () => {
    if (isBlocked) {
      toast.error(`waiting for "${dependsOnTask!.name}" to complete first`);
      return;
    }
    navigate(
      `/project/camera?milestoneId=${task.milestone_id}&item=${encodeURIComponent(task.name)}&taskId=${task.id}`
    );
  };

  return (
    <div className="flex flex-col bg-background px-6 pt-12 pb-40">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-6">← back</button>

      {/* ─── Task name ─── */}
      <h1 className="font-sans text-[22px] leading-tight text-foreground">{task.name}</h1>

      {/* ─── Milestone breadcrumb ─── */}
      {milestone && (
        <p className="font-mono text-[11px] text-muted-foreground mt-2">
          {String(milestone.position).padStart(2, "0")} · {milestone.name}
        </p>
      )}

      {/* ─── Status pill ─── */}
      <div className="mt-4">
        <span className={`inline-block font-mono text-[11px] px-2.5 py-1 rounded-full ${statusPillClass[task.status] ?? "bg-secondary text-muted-foreground"}`}>
          {task.status.replace("_", " ")}
        </span>
        {isBlocked && (
          <span className="ml-2 font-mono text-[11px] text-destructive">
            blocked — waiting for "{dependsOnTask!.name}"
          </span>
        )}
      </div>

      <div className="divider mt-6" />

      {/* ─── Assignment ─── */}
      <div className="mt-6">
        <p className="font-mono text-[10px] text-muted-foreground mb-2">assigned to</p>

        {!reassigning && !task.assigned_to && (
          <div className="flex items-center gap-3">
            <span className="font-sans text-[14px] text-muted-foreground">unassigned</span>
            {(isPM || isAssignedUser) && (
              <button onClick={() => setReassigning(true)} className="font-mono text-[11px] text-accent">
                assign
              </button>
            )}
          </div>
        )}

        {!reassigning && task.assigned_to && (
          <div className="flex items-center gap-3">
            <span className="font-sans text-[15px] text-foreground">{task.assigned_to_name}</span>
            {(isPM || isAssignedUser) && (
              <button
                onClick={() => setReassigning(true)}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                reassign
              </button>
            )}
          </div>
        )}

        {reassigning && (
          <div className="flex gap-2 items-center">
            <select
              className="flex-1 bg-secondary border border-border rounded px-3 py-2 font-sans text-[14px] text-foreground"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">select team member…</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedMemberId && handleAssign(selectedMemberId)}
              className="font-mono text-[12px] text-foreground border border-foreground rounded px-3 py-2"
            >
              save
            </button>
            <button onClick={() => setReassigning(false)} className="font-mono text-[12px] text-muted-foreground">
              cancel
            </button>
          </div>
        )}
      </div>

      {/* ─── Evidence required ─── */}
      <div className="mt-5">
        <p className="font-mono text-[10px] text-muted-foreground mb-1">evidence required</p>
        <span className={`font-mono text-[12px] ${task.evidence_required ? "text-foreground" : "text-muted-foreground"}`}>
          {task.evidence_required ? "yes" : "no"}
        </span>
      </div>

      <div className="divider mt-6" />

      {/* ─── Due date / budget / depends on ─── */}
      {editing ? (
        <div className="mt-6 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="font-mono text-[10px] text-muted-foreground mb-1">due date</p>
              <input
                type="date"
                className="w-full bg-secondary border border-border rounded px-3 py-2 font-mono text-[13px] text-foreground"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <div className="w-32">
              <p className="font-mono text-[10px] text-muted-foreground mb-1">budget</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[13px] text-muted-foreground">£</span>
                <input
                  type="number"
                  className="flex-1 bg-secondary border border-border rounded px-2 py-2 font-mono text-[13px] text-foreground"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground mb-1">depends on</p>
            <select
              className="w-full bg-secondary border border-border rounded px-3 py-2 font-sans text-[14px] text-foreground"
              value={editDependsOn}
              onChange={(e) => setEditDependsOn(e.target.value)}
            >
              <option value="">none</option>
              {siblingTasks.filter((t) => t.id !== task.id).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveEdit}
              disabled={updateTask.isPending}
              className="font-mono text-[12px] text-foreground border border-foreground rounded px-4 py-1.5"
            >
              save
            </button>
            <button onClick={() => setEditing(false)} className="font-mono text-[12px] text-muted-foreground">
              cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex gap-8">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1">due date</p>
              <p className="font-sans text-[14px] text-foreground">
                {task.due_date ? format(new Date(task.due_date), "d MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1">budget</p>
              <p className="font-sans text-[14px] text-foreground">
                {task.budget != null ? `£${Number(task.budget).toLocaleString()}` : "—"}
              </p>
            </div>
          </div>

          {task.depends_on && dependsOnTask && (
            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1">depends on</p>
              <p className="font-sans text-[14px] text-foreground">{dependsOnTask.name}</p>
            </div>
          )}

          {isPM && (
            <button
              onClick={startEdit}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              edit
            </button>
          )}
        </div>
      )}

      {/* ─── Activity log ─── */}
      {changes.length > 0 && (
        <>
          <div className="divider mt-8" />
          <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">activity</p>
          <div className="space-y-4">
            {changes.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px] ${entityDot[c.entity_type] ?? "bg-muted-foreground"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[13px] text-foreground leading-snug">{describeChange(c)}</p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{formatTimestamp(c.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Fixed action buttons above bottom nav ─── */}
      {(isAssignedUser || isPM) && task.status !== "complete" && (
        <div
          className="fixed bottom-16 left-0 right-0 px-6 bg-background space-y-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
        >
          {isAssignedUser && (
            <Button variant="dark" size="full" onClick={handleSubmitEvidence}>
              <span className="font-sans text-[16px]">submit evidence</span>
            </Button>
          )}
          <div className="flex gap-2">
            {task.status === "pending" && (
              <button
                onClick={() => handleStatusChange("in_progress")}
                className="flex-1 font-mono text-[12px] text-foreground border border-foreground rounded py-2"
              >
                start
              </button>
            )}
            {task.status === "in_progress" && (
              <button
                onClick={() => handleStatusChange("complete")}
                className="flex-1 font-mono text-[12px] text-success border border-success rounded py-2"
              >
                mark complete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
