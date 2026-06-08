import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useCurrentUser } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import type { Task } from "@/hooks/useSupabaseProject";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  return (
    <PMClientSpine
      milestones={milestones}
      currentProjectId={currentProjectId}
      role={role}
      t={t}
      navigate={navigate}
    />
  );
}

function PMClientSpine({
  milestones, currentProjectId, role, t, navigate,
}: {
  milestones: any[];
  currentProjectId: string | null;
  role: string;
  t: (k: string) => string;
  navigate: (path: string) => void;
}) {
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

  const inReviewIds = (milestones ?? []).filter(m => m.status === "in_review").map(m => m.id);
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

  const list = milestones ?? [];
  const total = list.length;
  const completed = list.filter(m => m.status === "complete").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const released = list
    .filter(m => m.status === "complete")
    .reduce((s, m) => s + Number(m.payment_value ?? 0), 0);
  const totalBudget = Number((project as any)?.total_budget ?? 0)
    || list.reduce((s, m) => s + Number(m.payment_value ?? 0), 0);

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

  const ordered = [...list].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        {/* Sticky header — no card wrapper, single line */}
        <div className="sticky top-0 z-20 bg-background px-6 pt-20 pb-4">
          <p className="font-sans text-[18px] font-medium text-foreground truncate">
            {(project as any)?.name ?? "project"}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-[3px] bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "#39FF14" }} />
            </div>
            <p className="font-mono text-[12px] text-gray-500 flex-shrink-0">
              {pct}% · {fmtK(released)} of {fmtK(totalBudget)}
            </p>
          </div>
        </div>

        {/* Spine */}
        <div className="flex-1 px-6 pt-4 pb-24">
          {ordered.length === 0 ? (
            role === "pm" ? (
              <PMAddCard variant="empty" navigate={navigate} />
            ) : (
              <div className="bg-white border border-gray-200 rounded-3xl px-6 py-8 mt-4">
                <p className="font-mono text-[13px] text-gray-500 text-center">
                  {t("milestone.no_milestones")}
                </p>
              </div>
            )
          ) : (
            <ul className="relative">
              {ordered.map((m, i) => {
                const st = stateOf(m.status);
                const isLast = i === ordered.length - 1;
                const evCount = evidenceCounts[m.id] ?? 0;

                const dotColor =
                  st === "verified" ? "#39FF14" :
                  st === "review" ? "#FF1744" :
                  st === "waiting" ? "#FF4500" :
                  "hsl(var(--border))";

                const pillStyle: React.CSSProperties =
                  st === "verified" ? { backgroundColor: "#39FF14", color: "#0a0a0a" } :
                  st === "review" ? { backgroundColor: "#FF1744", color: "#ffffff" } :
                  st === "waiting" ? { backgroundColor: "#FF4500", color: "#0a0a0a" } :
                  {};
                const pillClass = st === "idle" ? "bg-gray-100 text-gray-500" : "";

                const pillText =
                  st === "verified" ? "VERIFIED" :
                  st === "review" ? (evCount > 0 ? `${evCount} PHOTOS · AWAITING REVIEW` : "AWAITING REVIEW") :
                  st === "waiting" ? "WAITING FOR EVIDENCE" :
                  "NOT STARTED";

                const cardBg = st === "review"
                  ? "bg-white border-red-200"
                  : "bg-white border-gray-200";

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
                              ? "0 0 0 4px rgba(255, 23, 68, 0.18)"
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
                        <p className="font-mono text-[13px] text-gray-500 flex-shrink-0">
                          £{Number(m.payment_value ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded-full ${pillClass}`}
                          style={pillStyle}
                        >
                          {pillText}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {role === "pm" && currentProjectId && (
            <DeferredSuggestionsBanner projectId={currentProjectId} />
          )}

          {role === "pm" && (
            <PMAddCard variant="pill" navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  );
}

function PMAddCard({
  variant,
  navigate,
}: {
  variant: "empty" | "pill";
  navigate: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const actions: { label: string; sub: string; path: string }[] = [
    { label: "upload contract", sub: "extract milestones from a pdf", path: "/document-upload" },
    { label: "use a template", sub: "start from a construction template", path: "/template-select" },
    { label: "add manually", sub: "create a single milestone", path: "/manual-milestone" },
  ];

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  if (variant === "empty") {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl px-5 py-6 mt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-500">
          get started
        </p>
        <p className="font-sans text-[15px] text-foreground mt-1 mb-4">
          add milestones to this project
        </p>
        <div className="space-y-2">
          {actions.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="w-full text-left rounded-full border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <p className="font-sans text-[14px] text-foreground">+ {a.label}</p>
              <p className="font-mono text-[11px] text-gray-500 mt-0.5">{a.sub}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="w-full mt-4 py-4 bg-white border border-gray-200 rounded-full font-mono text-[12px] text-foreground hover:bg-gray-50 transition-colors"
        >
          + add to project
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-sans text-[16px] text-left">add to project</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-4 pb-4">
          {actions.map((a) => (
            <button
              key={a.path}
              onClick={() => go(a.path)}
              className="w-full text-left rounded-2xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <p className="font-sans text-[14px] text-foreground">+ {a.label}</p>
              <p className="font-mono text-[11px] text-gray-500 mt-0.5">{a.sub}</p>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
