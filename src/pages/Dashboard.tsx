import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useCurrentUser } from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import type { Task } from "@/hooks/useSupabaseProject";

export default function Dashboard() {
  const { role } = useRole();
  if (role === "pm" || role === "client") return <PMDashboard />;
  return <ContractorDashboard />;
}

/* ───────────────────── PM / CLIENT DASHBOARD ───────────────────── */

function PMDashboard() {
  const navigate = useNavigate();
  const { currentProjectId, setCurrentProjectId } = useProjectContext();
  const { role } = useRole();
  const { t } = useTranslation();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);

  const [isAnon, setIsAnon] = useState(false);
  const [cancelStep, setCancelStep] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.is_anonymous) setIsAnon(true);
    });
  }, []);

  const handleExitDemo = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    enabled: !!currentProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", currentProjectId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch evidence counts for in_review milestones
  const inReviewIds = milestones.filter(m => m.status === "in_review").map(m => m.id);
  const { data: evidenceCounts = {} } = useQuery({
    queryKey: ["evidence-counts", inReviewIds],
    enabled: inReviewIds.length > 0,
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of inReviewIds) {
        const { count } = await supabase
          .from("evidence")
          .select("id", { count: "exact", head: true })
          .eq("milestone_id", id);
        counts[id] = count ?? 0;
      }
      return counts;
    },
  });

  // Fetch assigned_to_name for in_progress milestones (from milestone itself now)
  const inProgressMilestones = milestones.filter(m => m.status === "in_progress");

  const [isCreator, setIsCreator] = useState(false);
  useEffect(() => {
    if (!project) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsCreator(user?.id === project.created_by);
    });
  }, [project]);

  const handleCancelProject = async () => {
    if (!currentProjectId) return;
    setCancelling(true);
    try {
      const { error } = await (supabase as any)
        .from("projects")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("id", currentProjectId);
      if (error) throw error;
      toast.success("Project cancelled");
      setCurrentProjectId(null);
      navigate("/");
    } catch {
      toast.error("Failed to cancel project");
    } finally {
      setCancelling(false);
      setCancelStep(0);
    }
  };

  if (!currentProjectId || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  if (!project) return null;

  const completed = milestones.filter(m => m.status === "complete").length;
  const total = milestones.length;
  const releasedBudget = milestones
    .filter(m => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  const needsApproval = milestones.filter(m => m.status === "in_review");
  const delays = milestones.filter(m => m.status === "overdue");
  const inProgress = inProgressMilestones;
  const pending = milestones.filter(m => m.status === "pending");
  const allClear = needsApproval.length === 0 && delays.length === 0 && inProgress.length === 0 && pending.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-10 pb-0">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              ← all projects
            </button>
            {isAnon && (
              <button onClick={handleExitDemo} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-opacity">
                {t("auth.sign_out")}
              </button>
            )}
          </div>

          <p className="font-mono text-[28px] tracking-tight text-foreground mt-6">
            {project.name?.toLowerCase()}
          </p>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">
            {completed} of {total} milestones complete · £{releasedBudget.toLocaleString()} released
          </p>
        </div>

        {/* Action queue */}
        <div className="px-6 mt-8 flex-1">
          {allClear ? (
            <div className="flex items-center justify-center py-20">
              <p className="font-sans text-[16px] text-muted-foreground">all clear — no actions needed</p>
            </div>
          ) : (
            <div className="space-y-8">
              {needsApproval.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">needs approval</p>
                  <div className="space-y-2">
                    {needsApproval.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-accent">{evidenceCounts[m.id] ?? 0} evidence</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {delays.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">delays to review</p>
                  <div className="space-y-2">
                    {delays.map(m => {
                      const daysOverdue = m.due_date ? differenceInDays(new Date(), new Date(m.due_date)) : 0;
                      return (
                        <button
                          key={m.id}
                          onClick={() => navigate("/project/cascade-review")}
                          className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                        >
                          <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                          <span className="font-mono text-[11px] text-destructive">{daysOverdue}d overdue</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {inProgress.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">waiting for evidence</p>
                  <div className="space-y-2">
                    {inProgress.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {(m as any).assigned_to_name ?? "unassigned"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cancel project (creator + PM only) */}
        {isCreator && role === "pm" && (
          <div className="px-6 pb-6">
            {cancelStep === 0 && (
              <button onClick={() => setCancelStep(1)} className="w-full font-mono text-[11px] text-destructive/60 hover:text-destructive transition-colors text-center py-3">
                cancel project
              </button>
            )}
            {cancelStep === 1 && (
              <div className="border border-destructive/30 p-4 space-y-3">
                <p className="font-mono text-[12px] text-foreground">are you sure you want to cancel this project?</p>
                <p className="font-mono text-[11px] text-muted-foreground">this will hide the project from all members. this action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setCancelStep(0)} className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border hover:border-foreground/40 transition-colors">go back</button>
                  <button onClick={() => setCancelStep(2)} className="flex-1 py-2 font-mono text-[12px] text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors">yes, cancel</button>
                </div>
              </div>
            )}
            {cancelStep === 2 && (
              <div className="border border-destructive p-4 space-y-3">
                <p className="font-mono text-[13px] text-destructive font-bold">final confirmation</p>
                <p className="font-mono text-[11px] text-foreground">type the project name to confirm: <strong>{project.name}</strong></p>
                <CancelConfirmInput projectName={project.name} onConfirm={handleCancelProject} onCancel={() => setCancelStep(0)} cancelling={cancelling} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── CONTRACTOR / TRADE DASHBOARD ─────────────── */

function ContractorDashboard() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { t } = useTranslation();
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(currentProjectId ?? undefined);
  const { data: user } = useCurrentUser();
  useRealtimeMilestones(currentProjectId ?? undefined);

  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    enabled: !!currentProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", currentProjectId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all tasks across all milestones assigned to this user
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["all-user-tasks", currentProjectId, user?.id],
    enabled: !!currentProjectId && !!user && milestones.length > 0,
    queryFn: async () => {
      const milestoneIds = milestones.map(m => m.id);
      if (milestoneIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("*")
        .in("milestone_id", milestoneIds)
        .eq("assigned_to", user!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  // Milestones assigned directly to this user (Mode A — no tasks)
  const myMilestones = useMemo(() => {
    if (!user) return [];
    return milestones.filter(m =>
      (m as any).assigned_to === user.id &&
      m.status !== "complete"
    );
  }, [milestones, user]);

  // Check which milestones have tasks
  const milestonesWithTasks = useMemo(() => {
    const set = new Set(allTasks.map(t => t.milestone_id));
    return set;
  }, [allTasks]);

  // We need to know ALL tasks per milestone to determine Mode A vs B
  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ["all-project-tasks-for-mode", currentProjectId],
    enabled: !!currentProjectId && milestones.length > 0,
    queryFn: async () => {
      const milestoneIds = milestones.map(m => m.id);
      if (milestoneIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("id, milestone_id")
        .in("milestone_id", milestoneIds);
      if (error) throw error;
      return (data ?? []) as { id: string; milestone_id: string }[];
    },
  });

  const milestonesWithAnyTasks = useMemo(() => {
    return new Set(allProjectTasks.map(t => t.milestone_id));
  }, [allProjectTasks]);

  // Build unified work list: Mode A milestones (no tasks) + Mode B tasks
  type WorkItem = {
    id: string;
    name: string;
    type: "milestone" | "task";
    parentMilestoneName: string;
    milestonePosition: number;
    position: number;
    status: string;
    dueDate: string | null;
    milestoneId: string;
    taskId: string | null;
  };

  const workItems = useMemo<WorkItem[]>(() => {
    const items: WorkItem[] = [];

    // Mode A: milestones assigned to user with NO tasks
    for (const m of myMilestones) {
      if (!milestonesWithAnyTasks.has(m.id)) {
        items.push({
          id: m.id,
          name: m.name,
          type: "milestone",
          parentMilestoneName: "",
          milestonePosition: m.position,
          position: 0,
          status: m.status,
          dueDate: m.due_date,
          milestoneId: m.id,
          taskId: null,
        });
      }
    }

    // Mode B: tasks assigned to user
    const incompleteTasks = allTasks.filter(t => t.status !== "complete");
    for (const t of incompleteTasks) {
      const m = milestones.find(ms => ms.id === t.milestone_id);
      items.push({
        id: t.id,
        name: t.name,
        type: "task",
        parentMilestoneName: m?.name ?? "",
        milestonePosition: m?.position ?? 999,
        position: t.position,
        status: t.status,
        dueDate: t.due_date ?? m?.due_date ?? null,
        milestoneId: t.milestone_id,
        taskId: t.id,
      });
    }

    // Sort by due date, then milestone position, then task position
    items.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const cmp = a.dueDate.localeCompare(b.dueDate);
        if (cmp !== 0) return cmp;
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;
      if (a.milestonePosition !== b.milestonePosition) return a.milestonePosition - b.milestonePosition;
      return a.position - b.position;
    });

    return items;
  }, [myMilestones, allTasks, milestones, milestonesWithAnyTasks]);

  const urgentItem = workItems[0] ?? null;
  const otherItems = workItems.slice(1);

  const urgentMilestone = urgentItem
    ? milestones.find(m => m.id === urgentItem.milestoneId)
    : null;
  const urgentMilestoneNumber = urgentMilestone
    ? urgentMilestone.position
    : 0;

  const isLoading = milestonesLoading || tasksLoading;

  if (!currentProjectId || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  const statusDot: Record<string, string> = {
    pending: "bg-muted-foreground",
    in_progress: "bg-foreground",
    overdue: "bg-destructive",
    in_review: "bg-accent",
    complete: "bg-success",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-10">
          <button onClick={() => navigate("/")} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            ← all projects
          </button>
          <p className="font-mono text-[20px] tracking-tight text-foreground mt-4">
            {project?.name?.toLowerCase()}
          </p>
        </div>

        {!urgentItem ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="font-sans text-[16px] text-muted-foreground text-center">
              no tasks assigned yet — ask your PM for the project code
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 mt-8 flex-1">
              <p className="font-mono text-[80px] leading-none tracking-tight text-foreground">
                {urgentMilestoneNumber}
              </p>
              <p className="font-sans text-[20px] text-foreground mt-2">
                {urgentItem.name}
              </p>
              <p className="font-mono text-[12px] text-muted-foreground mt-1">
                {urgentItem.type === "task"
                  ? urgentItem.parentMilestoneName?.toLowerCase()
                  : "milestone"}
              </p>

              {otherItems.length > 0 && (
                <div className="mt-10">
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">also outstanding</p>
                  <div className="space-y-1">
                    {otherItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() =>
                          item.type === "milestone"
                            ? navigate(`/project/milestone/${item.milestoneId}`)
                            : navigate(`/project/task/${item.taskId}`)
                        }
                        className="w-full flex items-center justify-between py-2 border-b border-border text-left"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[item.status] ?? "bg-muted-foreground"}`} />
                          <span className="font-sans text-[14px] text-foreground truncate">{item.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                          {item.type === "task" ? item.parentMilestoneName?.toLowerCase() : "milestone"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="fixed bottom-16 left-0 right-0 px-6 bg-background"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
            >
              <button
                onClick={() => {
                  if (urgentItem.type === "milestone") {
                    // Mode A: submit evidence directly against milestone
                    navigate(
                      `/project/camera?milestoneId=${urgentItem.milestoneId}&item=${encodeURIComponent(urgentItem.name)}`
                    );
                  } else {
                    // Mode B: submit evidence against task
                    navigate(
                      `/project/camera?milestoneId=${urgentItem.milestoneId}&item=${encodeURIComponent(urgentItem.name)}&taskId=${urgentItem.taskId}&taskName=${encodeURIComponent(urgentItem.name)}`
                    );
                  }
                }}
                className="w-full py-4 bg-foreground text-background font-sans text-[16px] text-center"
              >
                submit evidence
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Cancel confirm input ─────────────── */

function CancelConfirmInput({
  projectName,
  onConfirm,
  onCancel,
  cancelling,
}: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const [input, setInput] = useState("");
  const matches = input.trim().toLowerCase() === projectName.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder={projectName}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full bg-transparent border-b border-border font-mono text-[13px] text-foreground py-2 outline-none"
      />
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border">go back</button>
        <button onClick={onConfirm} disabled={!matches || cancelling} className="flex-1 py-2 font-mono text-[12px] text-destructive border border-destructive disabled:opacity-30">
          {cancelling ? "cancelling…" : "confirm cancel"}
        </button>
      </div>
    </div>
  );
}
