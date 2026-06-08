import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask, useCreateChange, useCurrentUser } from "@/hooks/useSupabaseProject";
import { toast } from "sonner";

interface RecommendedTasksProps {
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  contractType?: string;
  existingTaskCount: number;
}

interface WPTask {
  id: string;
  task: string;
  task_type: "M" | "C" | "BP";
  expected_evidence: string | null;
  concealment_flag: boolean;
  task_order: number;
}
interface WPGroup {
  work_package_key: string;
  label: string;
  sort_order: number;
  tasks: WPTask[];
}

function slugifyMilestoneName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  M: { label: "M", cls: "bg-destructive/10 text-destructive" },
  C: { label: "C", cls: "bg-accent/10 text-accent" },
  BP: { label: "BP", cls: "bg-secondary text-muted-foreground" },
};
const TYPE_FULL: Record<string, string> = {
  M: "Mandatory",
  C: "Contractual",
  BP: "Best practice",
};

export function RecommendedTasks({
  milestoneId,
  milestoneName,
  projectId,
  contractType = "JCT_MW",
  existingTaskCount,
}: RecommendedTasksProps) {
  const milestoneKey = useMemo(() => slugifyMilestoneName(milestoneName), [milestoneName]);
  const dismissStorageKey = `recommended-tasks:dismissed:${projectId}:${milestoneId}`;

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(dismissStorageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const persistDismissed = (next: Set<string>) => {
    setDismissed(next);
    try {
      localStorage.setItem(dismissStorageKey, JSON.stringify([...next]));
    } catch { /* ignore */ }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Keyword fallback so every milestone surfaces relevant suggestions,
  // even when there's no explicit row in milestone_work_packages.
  const KEYWORD_MAP: Record<string, string[]> = {
    site_setup_demolition: ["site setup", "site set up", "set-up", "set up", "mobilis", "demolition", "strip out", "enabling", "soft strip"],
    foundations_groundwork: ["foundation", "substructure", "groundwork", "dpc", "dig", "excavat"],
    structural_frame_roof: ["structural", "frame", "superstructure", "roof", "weathertight", "windows", "alteration"],
    first_fix_mep: ["first fix", "electric", "plumb", "mep", "carpentry"],
    plastering_drylining: ["plaster", "drylining", "screed"],
    kitchen_install: ["kitchen"],
    bathroom_fitout: ["bathroom", "tiling", "tile"],
    decoration_finishing: ["decoration", "finishing", "paint"],
    final_handover: ["handover", "completion", "practical", "sign-off", "sign off", "inspection", "building control"],
  };

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["recommended-tasks", contractType, milestoneKey, milestoneName],
    queryFn: async (): Promise<WPGroup[]> => {
      const { data: links } = await supabase
        .from("milestone_work_packages")
        .select("work_package_key, sort_order, work_packages(label)")
        .eq("contract_type", contractType)
        .eq("milestone_key", milestoneKey)
        .order("sort_order", { ascending: true });

      let resolved: { key: string; label: string; sort_order: number }[] =
        (links ?? []).map((l: any) => ({
          key: l.work_package_key,
          label: l.work_packages?.label ?? l.work_package_key,
          sort_order: l.sort_order ?? 0,
        }));

      if (resolved.length === 0) {
        const name = milestoneName.toLowerCase();
        const matchedKeys = Object.entries(KEYWORD_MAP)
          .filter(([, kws]) => kws.some((k) => name.includes(k)))
          .map(([k]) => k);
        if (matchedKeys.length === 0) return [];
        const { data: wps } = await supabase
          .from("work_packages")
          .select("work_package_key, label")
          .in("work_package_key", matchedKeys);
        resolved = (wps ?? []).map((w: any, i: number) => ({
          key: w.work_package_key,
          label: w.label,
          sort_order: i,
        }));
      }

      if (resolved.length === 0) return [];

      const keys = resolved.map((r) => r.key);
      const { data: tasks, error: tasksErr } = await supabase
        .from("work_package_tasks")
        .select("id, work_package_key, task, task_type, expected_evidence, concealment_flag, task_order")
        .in("work_package_key", keys)
        .order("task_order", { ascending: true });
      if (tasksErr) throw tasksErr;

      return resolved.map((r) => ({
        work_package_key: r.key,
        label: r.label,
        sort_order: r.sort_order,
        tasks: ((tasks ?? []) as any[])
          .filter((t) => t.work_package_key === r.key)
          .map((t) => ({
            id: t.id,
            task: t.task,
            task_type: t.task_type,
            expected_evidence: t.expected_evidence,
            concealment_flag: t.concealment_flag,
            task_order: t.task_order,
          })),
      }));
    },
  });

  const createTask = useCreateTask();
  const createChange = useCreateChange();
  const { data: currentUser } = useCurrentUser();

  const visibleGroups = useMemo(
    () => groups
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => !dismissed.has(t.id)) }))
      .filter((g) => g.tasks.length > 0),
    [groups, dismissed]
  );

  // Track position offset so newly added tasks don't collide
  const [addedCount, setAddedCount] = useState(0);
  useEffect(() => { setAddedCount(0); }, [milestoneId]);

  if (isLoading) return null;
  if (visibleGroups.length === 0) return null;

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    persistDismissed(next);
  };

  const handleAdd = async (task: WPTask, overrideText?: string) => {
    const name = (overrideText ?? task.task).trim();
    if (!name) return;
    try {
      const created = await createTask.mutateAsync({
        milestone_id: milestoneId,
        name,
        position: existingTaskCount + addedCount + 1,
        evidence_required: task.task_type === "M" || task.concealment_flag,
      } as any);
      setAddedCount((n) => n + 1);
      try {
        await createChange.mutateAsync({
          project_id: projectId,
          entity_type: "task",
          entity_id: created.id,
          entity_name: created.name,
          change_type: "created",
          changed_by: currentUser?.id,
          changed_by_name: currentUser?.email ?? undefined,
          new_value: { name: created.name, source: "recommended" },
        });
      } catch { /* ignore */ }
      handleDismiss(task.id);
      setEditingId(null);
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    }
  };

  return (
    <div className="bg-card rounded-3xl px-6 py-5">
      <p className="t-eyebrow mb-1">Recommended tasks</p>
      <p className="font-mono text-[11px] text-muted-foreground mb-4">
        Suggested from the {contractType.replace(/_/g, " ")} checklist for this milestone.
      </p>

      <div className="space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.work_package_key}>
            <p className="font-sans text-[14px] font-medium text-foreground mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.tasks.map((task) => {
                const badge = TYPE_BADGE[task.task_type] ?? TYPE_BADGE.BP;
                const isEditing = editingId === task.id;
                return (
                  <div
                    key={task.id}
                    className="border border-border/60 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        title={TYPE_FULL[task.task_type]}
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${badge.cls} flex-shrink-0 mt-0.5`}
                      >
                        {badge.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <textarea
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            className="w-full bg-secondary border border-border rounded px-2 py-1 font-sans text-[14px] text-foreground"
                          />
                        ) : (
                          <p className="font-sans text-[14px] text-foreground leading-snug">{task.task}</p>
                        )}
                        {task.expected_evidence && !isEditing && (
                          <p className="font-mono text-[11px] text-muted-foreground mt-1 leading-snug">
                            Evidence: {task.expected_evidence}
                          </p>
                        )}
                        {task.concealment_flag && !isEditing && (
                          <p className="font-mono text-[10px] text-warning mt-1" style={{ color: "#C4622A" }}>
                            ⚠ Photo required before sign-off
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2.5 pl-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleAdd(task, editText)}
                            disabled={createTask.isPending || !editText.trim()}
                            className="font-mono text-[11px] text-foreground border border-foreground rounded px-2.5 py-1 disabled:opacity-50"
                          >
                            add
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="font-mono text-[11px] text-muted-foreground"
                          >
                            cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAdd(task)}
                            disabled={createTask.isPending}
                            className="font-mono text-[11px] text-foreground border border-foreground rounded px-2.5 py-1 disabled:opacity-50"
                          >
                            add
                          </button>
                          <button
                            onClick={() => { setEditingId(task.id); setEditText(task.task); }}
                            className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            edit
                          </button>
                          <button
                            onClick={() => handleDismiss(task.id)}
                            className="font-mono text-[11px] text-muted-foreground hover:text-destructive"
                          >
                            dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
