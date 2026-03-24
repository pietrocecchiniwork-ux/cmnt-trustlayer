import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import {
  useMilestones,
  useEvidence,
  useUpdateMilestoneStatus,
  useUpdateMilestone,
  useUpdateEvidence,
  useTasks,
  useCreateTask,
  useCreateChange,
  useCurrentUser,
  useProjectMembers,
} from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-accent",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

const numberColor: Record<string, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-accent",
  overdue: "text-destructive",
  in_review: "text-accent",
  complete: "text-success",
};

function TaskCircle({ status }: { status: string }) {
  if (status === "complete")
    return <span className="w-4 h-4 rounded-full bg-success flex-shrink-0" />;
  if (status === "in_progress")
    return <span className="w-4 h-4 rounded-full bg-accent flex-shrink-0" />;
  return <span className="w-4 h-4 rounded-full border border-muted-foreground flex-shrink-0" />;
}

export default function MilestoneDetailPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { t } = useTranslation();

  // Only query tasks when milestoneId is a valid UUID
  const validMilestoneId = milestoneId && UUID_RE.test(milestoneId) ? milestoneId : undefined;

  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: evidenceItems = [] } = useEvidence(validMilestoneId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(validMilestoneId);
  const { data: members = [] } = useProjectMembers(currentProjectId ?? undefined);
  const { data: currentUser } = useCurrentUser();
  const { role } = useRole();

  const updateStatus = useUpdateMilestoneStatus();
  const updateMilestone = useUpdateMilestone();
  const updateEvidence = useUpdateEvidence();
  const createTask = useCreateTask();
  const createChange = useCreateChange();

  const seededRef = useRef(false);

  // ─── Edit state ───
  const [editing, setEditing] = useState(false);
  // ─── Quality assessment state ───
  const [qaPrompt, setQaPrompt] = useState(false);

  // ─── Add task state ───
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskBudget, setNewTaskBudget] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPayment, setEditPayment] = useState("");

  const milestone = milestones.find((m) => m.id === milestoneId);

  // Debug: log milestoneId on mount to confirm it's arriving
  useEffect(() => {
    console.log("[MilestoneDetail] milestoneId:", milestoneId, "validMilestoneId:", validMilestoneId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auto-seed tasks from legacy checklist (backwards compat) ───
  useEffect(() => {
    if (seededRef.current) return;
    if (!milestone || !validMilestoneId) return;
    if (tasksLoading) return;
    if (tasks.length > 0) { seededRef.current = true; return; }

    const checklist: string[] = Array.isArray(milestone.checklist)
      ? (milestone.checklist as string[])
      : [];
    if (checklist.length === 0) return;

    seededRef.current = true;
    checklist.forEach((item, i) => {
      createTask.mutate(
        { milestone_id: validMilestoneId, name: item, position: i + 1, evidence_required: true },
        {
          onSuccess: (task) => {
            if (currentProjectId) {
              createChange.mutate({
                project_id: currentProjectId,
                entity_type: "task",
                entity_id: task.id,
                entity_name: task.name,
                change_type: "created",
                changed_by: currentUser?.id,
                changed_by_name: currentUser?.email ?? undefined,
              });
            }
          },
        }
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestone, validMilestoneId, tasks.length, tasksLoading]);

  if (!milestone) return null;

  const dotClass = statusDotClass[milestone.status] ?? "bg-muted-foreground";
  const numColor = numberColor[milestone.status];
  const completedCount = evidenceItems.length;

  // Next incomplete task (for contractor "take photo" prompt)
  const nextIncompleteTask = tasks.find((t) => t.status !== "complete") ?? null;

  // ─── Inline edit handlers ───
  const startEdit = () => {
    setEditName(milestone.name);
    setEditDate(milestone.due_date ?? "");
    setEditPayment(String(milestone.payment_value ?? ""));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!currentProjectId) return;
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (editName !== milestone.name) {
      oldValues.name = milestone.name; newValues.name = editName;
    }
    if (editDate !== (milestone.due_date ?? "")) {
      oldValues.due_date = milestone.due_date; newValues.due_date = editDate;
    }
    const newPayment = editPayment ? Number(editPayment) : null;
    if (newPayment !== milestone.payment_value) {
      oldValues.payment_value = milestone.payment_value; newValues.payment_value = newPayment;
    }

    try {
      await updateMilestone.mutateAsync({
        id: milestone.id,
        projectId: currentProjectId,
        ...(editName !== milestone.name && { name: editName }),
        ...(editDate !== (milestone.due_date ?? "") && { due_date: editDate }),
        ...(newPayment !== milestone.payment_value && { payment_value: newPayment ?? undefined }),
      });

      const isDateShift = oldValues.due_date !== undefined;
      await createChange.mutateAsync({
        project_id: currentProjectId,
        entity_type: "milestone",
        entity_id: milestone.id,
        entity_name: milestone.name,
        change_type: isDateShift ? "shifted" : "updated",
        changed_by: currentUser?.id,
        changed_by_name: currentUser?.email ?? undefined,
        old_value: Object.keys(oldValues).length ? oldValues : undefined,
        new_value: Object.keys(newValues).length ? newValues : undefined,
      });

      toast.success(t("milestone.edit") + " saved");
      setEditing(false);
    } catch {
      toast.error("failed to save changes");
    }
  };

  const handleApprove = () => {
    setQaPrompt(true);
  };

  const confirmApprove = async (assessment: string) => {
    setQaPrompt(false);
    try {
      await Promise.all(
        evidenceItems.map((e) =>
          updateEvidence.mutateAsync({
            id: e.id,
            milestoneId: milestone.id,
            quality_assessment: assessment,
            label_dimensions_captured: 2,
            verification_level: 3,
          })
        )
      );
      await updateStatus.mutateAsync({ id: milestone.id, status: "complete", projectId: currentProjectId! });
      if (currentProjectId) {
        await createChange.mutateAsync({
          project_id: currentProjectId,
          entity_type: "milestone",
          entity_id: milestone.id,
          entity_name: milestone.name,
          change_type: "approved",
          changed_by: currentUser?.id,
          changed_by_name: currentUser?.email ?? undefined,
          new_value: { quality_assessment: assessment },
        });
      }
      toast.success(t("milestone.approved"));
      navigate(-1);
    } catch {
      toast.error("Failed to approve milestone");
    }
  };

  const handleReject = async () => {
    try {
      await updateStatus.mutateAsync({ id: milestone.id, status: "in_progress", projectId: currentProjectId! });
      if (currentProjectId) {
        await createChange.mutateAsync({
          project_id: currentProjectId,
          entity_type: "milestone",
          entity_id: milestone.id,
          entity_name: milestone.name,
          change_type: "rejected",
          changed_by: currentUser?.id,
          changed_by_name: currentUser?.email ?? undefined,
        });
      }
      toast.success(t("milestone.rejected_back"));
      navigate(-1);
    } catch {
      toast.error("Failed to reject milestone");
    }
  };

  // ─── Add task handler ───
  const handleAddTask = async () => {
    const name = newTaskName.trim();
    if (!name || !validMilestoneId) return;
    const assignee = members.find((m) => m.user_id === newTaskAssigneeId);
    createTask.mutate(
      {
        milestone_id: validMilestoneId,
        name,
        position: tasks.length + 1,
        evidence_required: true,
        due_date: newTaskDate || undefined,
        budget: newTaskBudget ? Number(newTaskBudget) : undefined,
        ...(assignee?.user_id && { assigned_to: assignee.user_id, assigned_to_name: assignee.name, assigned_role: assignee.role }),
      },
      {
        onSuccess: (task) => {
          if (currentProjectId) {
            createChange.mutate({
              project_id: currentProjectId,
              entity_type: "task",
              entity_id: task.id,
              entity_name: task.name,
              change_type: "created",
              changed_by: currentUser?.id,
              changed_by_name: currentUser?.email ?? undefined,
            });
          }
          setNewTaskName("");
          setNewTaskDate("");
          setNewTaskBudget("");
          setNewTaskAssigneeId("");
          setAddingTask(false);
        },
      }
    );
  };

  // ─── Tasks section (shared across roles) ───
  const tasksSection = (
    <>
      <div className="divider mt-6" />
      <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-3">{t("tasks.tasks")}</p>
      {tasksLoading && (
        <p className="font-mono text-[11px] text-muted-foreground">{t("common.loading")}</p>
      )}
      <div className="space-y-0">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => navigate(`/project/task/${task.id}`)}
            className="w-full flex items-center gap-3 py-3 border-b border-border/40 last:border-0 text-left"
          >
            <TaskCircle status={task.status} />
            <div className="flex-1 min-w-0">
              <p className="font-sans text-[15px] text-foreground leading-snug">{task.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                {task.assigned_to_name ?? t("common.unassigned")}
              </p>
            </div>
            <span className="font-mono text-[13px] text-muted-foreground">→</span>
          </button>
        ))}
      </div>

      {/* Add task (PM only) */}
      {role === "pm" && (
        addingTask ? (
          <div className="mt-3 space-y-2">
            <input
              autoFocus
              className="w-full bg-secondary border border-border rounded px-3 py-1.5 font-sans text-[14px] text-foreground"
              placeholder={t("tasks.task_name")}
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setAddingTask(false); }}
            />
            <select
              className="w-full bg-secondary border border-border rounded px-3 py-1.5 font-mono text-[13px] text-foreground"
              value={newTaskAssigneeId}
              onChange={(e) => setNewTaskAssigneeId(e.target.value)}
            >
              <option value="">{t("tasks.assign_placeholder")}</option>
              {members.filter(m => m.user_id).map((m) => (
                <option key={m.user_id} value={m.user_id!}>{m.name} — {m.role}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 bg-secondary border border-border rounded px-3 py-1.5 font-mono text-[13px] text-foreground"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
              />
              <div className="flex items-center gap-1 w-28">
                <span className="font-mono text-[13px] text-muted-foreground">£</span>
                <input
                  type="number"
                  className="flex-1 bg-secondary border border-border rounded px-2 py-1.5 font-mono text-[13px] text-foreground"
                  placeholder={t("tasks.budget")}
                  value={newTaskBudget}
                  onChange={(e) => setNewTaskBudget(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                disabled={createTask.isPending || !newTaskName.trim()}
                className="font-mono text-[12px] text-foreground border border-foreground rounded px-3 py-1.5"
              >
                {t("common.add")}
              </button>
              <button onClick={() => { setAddingTask(false); setNewTaskName(""); setNewTaskDate(""); setNewTaskBudget(""); setNewTaskAssigneeId(""); }} className="font-mono text-[12px] text-muted-foreground">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-3"
          >
            {t("tasks.add_task")}
          </button>
        )
      )}

      {/* Budget allocation summary */}
      {tasks.length > 0 && (
        <p className="font-mono text-[11px] text-muted-foreground mt-4">
          {t("tasks.tasks")}: £{tasks.reduce((s, task) => s + (task.budget ?? 0), 0).toLocaleString()} of £{Number(milestone?.payment_value ?? 0).toLocaleString()} allocated
        </p>
      )}
    </>
  );

  // ─── Contractor view ───
  if (role === "contractor" && milestone.status !== "complete" && milestone.status !== "in_review") {
    const allTasksDone = tasks.length > 0 && tasks.every(t => t.status === "complete");

    return (
      <div className="flex flex-col bg-background px-6 pt-12 pb-40">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">{t("common.back")}</button>
        <p className={`font-mono text-[96px] leading-none tracking-tight ${numColor}`}>
          {String(milestone.position).padStart(2, "0")}
        </p>
        <h1 className="font-sans text-[22px] leading-tight mt-3 text-foreground">{milestone.name}</h1>
        <p className="font-mono text-[13px] text-muted-foreground mt-2">{milestone.due_date ?? t("milestone.no_date")}</p>

        {tasksSection}

        <div className="divider mt-6" />
        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">{t("evidence.submitted_evidence")} ({completedCount})</p>
        <div className="flex-1 space-y-3">
          {evidenceItems.map((e) => (
            <div key={e.id} className="flex items-start gap-3 py-2">
              {e.photo_url ? (
                <img src={e.photo_url} alt="evidence" className="w-[44px] h-[44px] object-cover flex-shrink-0" />
              ) : (
                <div className="w-[44px] h-[44px] bg-secondary flex-shrink-0" />
              )}
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {format(new Date(e.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {e.note && <p className="font-sans text-[13px] text-foreground mt-0.5">{e.note}</p>}
              </div>
            </div>
          ))}
        </div>

        {allTasksDone && (
          <p className="font-mono text-[12px] text-success mt-4">{t("evidence.all_submitted")}</p>
        )}

        {/* Fixed take photo button — shown when there's a next incomplete task */}
        {!allTasksDone && nextIncompleteTask && (
          <div
            className="fixed bottom-16 left-0 right-0 px-6 bg-background"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
          >
            <p className="font-mono text-[12px] text-muted-foreground mb-3">
              {t("evidence.next")}: {nextIncompleteTask.name}
            </p>
            <Button
              variant="dark"
              size="full"
              onClick={() =>
                navigate(`/project/camera?milestoneId=${milestone.id}&item=${encodeURIComponent(nextIncompleteTask.name)}&taskId=${nextIncompleteTask.id}`)
              }
            >
              <span className="font-sans text-[16px]">{t("evidence.take_photo")}</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PM / in-review / complete view ───
  return (
    <div className="flex flex-col bg-background">
      <div className="px-6 pt-12 pb-40">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">{t("common.back")}</button>

        <p className={`font-mono text-[96px] leading-none tracking-tight ${numColor}`}>
          {String(milestone.position).padStart(2, "0")}
        </p>

        {editing ? (
          <div className="mt-3 space-y-3">
            <input
              className="w-full bg-secondary border border-border rounded px-3 py-2 font-sans text-[15px] text-foreground"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t("milestone.name")}
            />
            <div className="flex gap-3">
              <input
                className="flex-1 bg-secondary border border-border rounded px-3 py-2 font-mono text-[13px] text-foreground"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                placeholder="yyyy-mm-dd"
              />
              <input
                className="w-32 bg-secondary border border-border rounded px-3 py-2 font-mono text-[13px] text-foreground"
                value={editPayment}
                onChange={(e) => setEditPayment(e.target.value)}
                placeholder="£ value"
                type="number"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveEdit}
                disabled={updateMilestone.isPending}
                className="font-mono text-[12px] text-foreground border border-foreground rounded px-4 py-1.5"
              >
                {t("common.save")}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="font-mono text-[12px] text-muted-foreground"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3 mt-3">
              <h1 className="font-sans text-[22px] leading-tight text-foreground">{milestone.name}</h1>
              {role === "pm" && (
                <button
                  onClick={startEdit}
                  className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("common.edit")}
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3">
              <span className="font-mono text-[13px] text-muted-foreground">{milestone.due_date ?? t("milestone.no_date")}</span>
              <span className="font-mono text-[13px] text-muted-foreground">£{Number(milestone.payment_value ?? 0).toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              <span className="font-mono text-[12px] text-muted-foreground">{t(`milestone.status.${milestone.status}`)}</span>
            </div>
          </>
        )}

        {tasksSection}

        <div className="divider mt-6" />
        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">{t("evidence.evidence")} ({completedCount})</p>

        <div className="space-y-4">
          {evidenceItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              {item.photo_url ? (
                <img src={item.photo_url} alt="evidence" className="w-[52px] h-[52px] object-cover flex-shrink-0" />
              ) : (
                <div className="w-[52px] h-[52px] bg-secondary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {format(new Date(item.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {item.note && <p className="font-sans text-[13px] text-foreground mt-0.5">{item.note}</p>}
                {item.ai_tags && typeof item.ai_tags === "object" && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {Object.values(item.ai_tags as Record<string, string>).map((tag, i) => (
                      <span key={i} className="font-mono text-[10px] text-accent border-b border-accent/40 pb-0.5">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {evidenceItems.length === 0 && (
            <p className="font-sans text-[13px] text-muted-foreground">{t("evidence.no_evidence")}</p>
          )}
        </div>
      </div>

      {/* Fixed action buttons above bottom nav */}
      <div
        className="fixed bottom-16 left-0 right-0 px-6 bg-background space-y-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
      >
        {qaPrompt && (
          <div className="space-y-2 pb-1">
            <p className="font-mono text-[11px] text-muted-foreground">{t("milestone.quality_assessment")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => confirmApprove("satisfactory")}
                className="flex-1 font-mono text-[12px] text-success border border-success rounded py-2"
              >
                {t("milestone.satisfactory")}
              </button>
              <button
                onClick={() => confirmApprove("requires_attention")}
                className="flex-1 font-mono text-[12px] text-destructive border border-destructive rounded py-2"
              >
                {t("milestone.requires_attention")}
              </button>
            </div>
            <button onClick={() => setQaPrompt(false)} className="font-mono text-[11px] text-muted-foreground">
              {t("common.cancel")}
            </button>
          </div>
        )}
        {!qaPrompt && (milestone.status === "in_review" || (evidenceItems.length > 0 && milestone.status !== "complete")) && (
          <>
            <Button variant="approve" size="full" onClick={handleApprove} disabled={updateStatus.isPending}>
              <span className="font-sans text-[16px]">{t("milestone.approve")}</span>
            </Button>
            <Button variant="reject" size="full" onClick={handleReject} disabled={updateStatus.isPending}>
              <span className="font-sans text-[16px]">{t("milestone.reject")}</span>
            </Button>
          </>
        )}
        {milestone.status === "overdue" && (
          <Button variant="destructive" size="full" onClick={() => navigate("/project/cascade-review")}>
            <span className="font-sans text-[16px]">{t("milestone.review_cascade")}</span>
          </Button>
        )}
        {milestone.status === "complete" && (
          <Button variant="dark" size="full" onClick={() => navigate(`/project/payment-certificate/${milestone.id}`)}>
            <span className="font-sans text-[16px]">{t("milestone.view_payment_certificate")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
