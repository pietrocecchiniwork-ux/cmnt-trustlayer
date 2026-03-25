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

  // Fetch assignments for in_progress milestones
  const inProgressIds = milestones.filter(m => m.status === "in_progress").map(m => m.id);
  const { data: assignmentMap = {} } = useQuery({
    queryKey: ["milestone-assignments-names", inProgressIds],
    enabled: inProgressIds.length > 0,
    queryFn: async () => {
      const map: Record<string, string[]> = {};
      for (const id of inProgressIds) {
        const { data: tasks } = await (supabase as any)
          .from("tasks")
          .select("assigned_to_name")
          .eq("milestone_id", id)
          .not("assigned_to_name", "is", null);
        const names = [...new Set((tasks ?? []).map((t: any) => t.assigned_to_name as string))];
        if (names.length > 0) map[id] = names;
      }
      return map;
    },
  });

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
  const inProgress = milestones.filter(m => m.status === "in_progress");
  const allClear = needsApproval.length === 0 && delays.length === 0 && inProgress.length === 0;

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
              <p className="font-sans text-[16px] text-muted-foreground">all clear</p>
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
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">in progress</p>
                  <div className="space-y-2">
                    {inProgress.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {(assignmentMap[m.id] ?? []).join(", ") || "unassigned"}
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

  // Fetch all tasks across all milestones
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["all-user-tasks", currentProjectId, user?.id],
    enabled: !!currentProjectId && !!user,
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

  // Sort tasks by milestone position then task position
  const sortedTasks = useMemo(() => {
    const milestonePositionMap = Object.fromEntries(milestones.map(m => [m.id, m.position]));
    return [...allTasks].sort((a, b) => {
      const mPosA = milestonePositionMap[a.milestone_id] ?? 999;
      const mPosB = milestonePositionMap[b.milestone_id] ?? 999;
      if (mPosA !== mPosB) return mPosA - mPosB;
      return a.position - b.position;
    });
  }, [allTasks, milestones]);

  const incompleteTasks = sortedTasks.filter(t => t.status !== "complete");
  const urgentTask = incompleteTasks[0] ?? null;
  const otherTasks = incompleteTasks.slice(1);

  const urgentMilestone = urgentTask
    ? milestones.find(m => m.id === urgentTask.milestone_id)
    : null;
  const urgentMilestoneNumber = urgentMilestone
    ? milestones.indexOf(urgentMilestone) + 1
    : 0;

  const isLoading = milestonesLoading || tasksLoading;

  if (!currentProjectId || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

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

        {!urgentTask ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="font-sans text-[16px] text-muted-foreground text-center">
              no tasks assigned yet — contact your PM
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 mt-8 flex-1">
              <p className="font-mono text-[80px] leading-none tracking-tight text-foreground">
                {urgentMilestoneNumber}
              </p>
              <p className="font-sans text-[20px] text-foreground mt-2">
                {urgentTask.name}
              </p>
              <p className="font-mono text-[12px] text-muted-foreground mt-1">
                {urgentMilestone?.name?.toLowerCase()}
              </p>

              {otherTasks.length > 0 && (
                <div className="mt-10">
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">also outstanding</p>
                  <div className="space-y-1">
                    {otherTasks.map(t => {
                      const m = milestones.find(m => m.id === t.milestone_id);
                      return (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-border">
                          <span className="font-sans text-[14px] text-foreground">{t.name}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{m?.name?.toLowerCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div
              className="fixed bottom-16 left-0 right-0 px-6 bg-background"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
            >
              <button
                onClick={() =>
                  navigate(
                    `/project/camera?milestoneId=${urgentTask.milestone_id}&item=${encodeURIComponent(urgentTask.name)}&taskId=${urgentTask.id}&taskName=${encodeURIComponent(urgentTask.name)}`
                  )
                }
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
        className="w-full font-mono text-[13px] bg-transparent border-b border-destructive/40 text-foreground py-2 outline-none placeholder:text-muted-foreground/40"
      />
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border hover:border-foreground/40 transition-colors">
          go back
        </button>
        <button
          onClick={onConfirm}
          disabled={!matches || cancelling}
          className="flex-1 py-2 font-mono text-[12px] text-destructive-foreground bg-destructive border border-destructive disabled:opacity-40 transition-colors"
        >
          {cancelling ? "cancelling..." : "cancel project"}
        </button>
      </div>
    </div>
  );
}
