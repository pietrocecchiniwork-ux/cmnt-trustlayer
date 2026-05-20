import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useCurrentUser } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Task } from "@/hooks/useSupabaseProject";

const STATUS_FILTERS = ["all", "pending", "in_progress", "in_review", "overdue", "complete"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-foreground",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

export default function MilestonesList() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { role } = useRole();
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isWorker = role === "contractor" || role === "trade";

  // Fetch all tasks for this project (for worker unified view)
  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ["all-project-tasks-list", currentProjectId, user?.id],
    enabled: !!currentProjectId && isWorker && !!user && milestones.length > 0,
    queryFn: async () => {
      const milestoneIds = milestones.map(m => m.id);
      if (milestoneIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("*")
        .in("milestone_id", milestoneIds);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  // Build milestones that have tasks
  const milestonesWithTasks = useMemo(() => {
    return new Set(allProjectTasks.map(t => t.milestone_id));
  }, [allProjectTasks]);

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
    paymentValue: number | null;
  };

  const workItems = useMemo<WorkItem[]>(() => {
    if (!isWorker || !user) return [];
    const items: WorkItem[] = [];

    // Mode A milestones (no tasks, assigned to user)
    for (const m of milestones) {
      if ((m as any).assigned_to === user.id && !milestonesWithTasks.has(m.id)) {
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
          paymentValue: m.payment_value,
        });
      }
    }

    // Mode B tasks assigned to user
    for (const t of allProjectTasks) {
      if (t.assigned_to === user.id) {
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
          paymentValue: t.budget,
        });
      }
    }

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
  }, [milestones, allProjectTasks, user, isWorker, milestonesWithTasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  // Worker: show unified "my work" view
  if (isWorker) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
          <div className="px-6 pt-20 pb-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate("/project/dashboard")} className="font-mono text-[14px] text-muted-foreground hover:text-foreground transition-colors">
                ←
              </button>
              <span className="font-mono text-[16px] text-muted-foreground">—</span>
            </div>
            <p className="font-mono text-[28px] tracking-tight text-foreground">
              my work
            </p>
            <p className="font-mono text-[12px] text-muted-foreground mt-1">
              {workItems.filter(w => w.status === "complete").length} of {workItems.length} complete
            </p>
          </div>

          <div className="flex-1 px-6 pb-6">
            <div className="space-y-0">
              {workItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    item.type === "milestone"
                      ? navigate(`/project/milestone/${item.milestoneId}`)
                      : navigate(`/project/task/${item.taskId}`)
                  }
                  className="w-full flex items-center justify-between py-4 border-b border-border text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[14px] text-foreground truncate">{item.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {item.type === "task" ? item.parentMilestoneName?.toLowerCase() : "milestone"} · {item.dueDate ?? "no date"}
                    </p>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotClass[item.status] ?? "bg-muted-foreground"}`} />
                </button>
              ))}
              {workItems.length === 0 && (
                <p className="font-mono text-[13px] text-muted-foreground mt-4">no work assigned yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PM/Client: vertical project spine
  return <PMClientSpine />;

  function PMClientSpine() {
    const { data: project } = useQuery({
      queryKey: ["project", currentProjectId],
      enabled: !!currentProjectId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects").select("*").eq("id", currentProjectId!).single();
        if (error) throw error;
        return data;
      },
    });

    const inReviewIds = milestones.filter(m => m.status === "in_review").map(m => m.id);
    const { data: evidenceCounts = {} } = useQuery<Record<string, number>>({
      queryKey: ["spine-evidence-counts", inReviewIds],
      enabled: inReviewIds.length > 0,
      queryFn: async () => {
        const counts: Record<string, number> = {};
        for (const id of inReviewIds) {
          const { count } = await supabase
            .from("evidence").select("id", { count: "exact", head: true }).eq("milestone_id", id);
          counts[id] = count ?? 0;
        }
        return counts;
      },
    });

    const total = milestones.length;
    const completed = milestones.filter(m => m.status === "complete").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const released = milestones
      .filter(m => m.status === "complete")
      .reduce((s, m) => s + Number(m.payment_value ?? 0), 0);
    const totalBudget = Number((project as any)?.total_budget ?? 0)
      || milestones.reduce((s, m) => s + Number(m.payment_value ?? 0), 0);

    const fmtK = (n: number) => {
      if (n >= 1000) return `£${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
      return `£${n.toLocaleString()}`;
    };

    type SpineState = "verified" | "review" | "waiting" | "idle";
    const stateOf = (status: string): SpineState => {
      if (status === "complete") return "verified";
      if (status === "in_review") return "review";
      if (status === "in_progress" || status === "overdue") return "waiting";
      return "idle";
    };

    const ordered = [...milestones].sort((a, b) => a.position - b.position);

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-background px-6 pt-20 pb-4 border-b border-border/40">
            <p className="font-sans text-[18px] font-medium text-foreground truncate">
              {(project as any)?.name ?? "project"}
            </p>
            <div className="mt-3 h-[3px] w-full bg-border rounded-full overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${pct}%` }} />
            </div>
            <p className="font-mono text-[12px] text-muted-foreground mt-2">
              {pct}% · {fmtK(released)} of {fmtK(totalBudget)} released
            </p>
          </div>

          {/* Spine */}
          <div className="flex-1 px-6 pt-4 pb-6">
            {ordered.length === 0 ? (
              <div className="bg-card rounded-3xl px-6 py-8 mt-4">
                <p className="font-mono text-[13px] text-muted-foreground text-center">
                  {t("milestone.no_milestones")}
                </p>
              </div>
            ) : (
              <ul className="relative">
                {ordered.map((m, i) => {
                  const st = stateOf(m.status);
                  const isLast = i === ordered.length - 1;
                  const evCount = evidenceCounts[m.id] ?? 0;

                  const dotColor =
                    st === "verified" ? "#1D9E75" :
                    st === "review" ? "#E24B4A" :
                    st === "waiting" ? "#EF9F27" :
                    "hsl(var(--border))";

                  const pillClass =
                    st === "verified" ? "bg-[#1D9E75]/15 text-[#1D9E75]" :
                    st === "review" ? "bg-[#E24B4A]/15 text-[#E24B4A]" :
                    st === "waiting" ? "bg-[#EF9F27]/20 text-[#B5710F]" :
                    "bg-muted text-muted-foreground";

                  const pillText =
                    st === "verified" ? "verified" :
                    st === "review" ? (evCount > 0 ? `${evCount} photos · awaiting your review` : "awaiting review") :
                    st === "waiting" ? "waiting for evidence" :
                    "not started";

                  const cardBg = st === "review"
                    ? "bg-[#FCEBEB] border-red-200"
                    : "bg-card border-border/60";

                  return (
                    <li key={m.id} className="flex items-stretch gap-3">
                      {/* Spine column */}
                      <div className="relative w-7 flex-shrink-0 flex flex-col items-center">
                        <div className="pt-4">
                          <span
                            className="block w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: dotColor,
                              boxShadow: st === "review"
                                ? "0 0 0 4px rgba(226, 75, 74, 0.18)"
                                : undefined,
                            }}
                          />
                        </div>
                        {!isLast && (
                          <div
                            className="flex-1 w-[2px] mt-1"
                            style={{ backgroundColor: "hsl(var(--border))" }}
                          />
                        )}
                      </div>

                      {/* Card */}
                      <button
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className={`flex-1 text-left rounded-xl border ${cardBg} px-4 py-3 mb-3 transition-colors hover:brightness-[0.99]`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-sans text-[14px] font-medium text-foreground lowercase truncate">
                            {m.name}
                          </p>
                          <p className="font-mono text-[13px] text-muted-foreground flex-shrink-0">
                            £{Number(m.payment_value ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center font-mono text-[10px] px-2 py-0.5 rounded-full ${pillClass}`}>
                            {pillText}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {role === "pm" && ordered.length > 0 && (
              <button
                onClick={() => navigate("/manual-milestone")}
                className="w-full mt-4 py-4 bg-card rounded-full font-mono text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("milestone.add_milestone")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
