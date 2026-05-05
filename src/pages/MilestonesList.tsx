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

  // PM/Client: original milestones list with search + filter
  const filteredMilestones = milestones.filter(m => {
    const q = search.trim().toLowerCase();
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (q && !m.name?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-20 pb-6 space-y-3">
          <div className="bg-card rounded-3xl px-6 py-5">
            <p className="t-eyebrow">{t("navigation.milestones")}</p>
            <p className="font-sans text-[26px] tracking-[-0.02em] text-foreground mt-1 lowercase">
              {milestones.length} items
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mt-2">
              {t("milestone.items_complete", {
                count: milestones.length,
                done: milestones.filter(m => m.status === "complete").length,
              })}
            </p>
          </div>

          <div className="bg-card rounded-3xl px-6 py-5 space-y-3">
            <input
              type="text"
              placeholder="search milestones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary rounded-full font-mono text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`font-mono text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 pb-6 space-y-3">
          {filteredMilestones.length > 0 && (
            <div className="bg-card rounded-3xl px-6 py-2">
              <div className="flex flex-col">
                {filteredMilestones.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/project/milestone/${m.id}`)}
                    className={`w-full flex items-center justify-between py-4 text-left group ${
                      i !== filteredMilestones.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="font-mono text-[16px] text-muted-foreground group-hover:text-foreground transition-opacity flex-shrink-0">
                        {String(m.position).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-[14px] text-foreground truncate">{m.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                          {m.due_date ?? "no date"} · £{Number(m.payment_value ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotClass[m.status]}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredMilestones.length === 0 && milestones.length > 0 && (
            <div className="bg-card rounded-3xl px-6 py-8">
              <p className="font-mono text-[13px] text-muted-foreground text-center">no milestones match your filters</p>
            </div>
          )}
          {milestones.length === 0 && (
            <div className="bg-card rounded-3xl px-6 py-8">
              <p className="font-mono text-[13px] text-muted-foreground text-center">{t("milestone.no_milestones")}</p>
            </div>
          )}

          {role === "pm" && (
            <button
              onClick={() => navigate("/manual-milestone")}
              className="w-full py-4 bg-card rounded-full font-mono text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("milestone.add_milestone")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
