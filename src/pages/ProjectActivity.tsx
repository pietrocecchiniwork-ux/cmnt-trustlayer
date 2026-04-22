import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectChanges, useCurrentUser, useProjectMembers, useProject } from "@/hooks/useSupabaseProject";
import type { ProjectChange } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { exportAuditTrail } from "@/lib/exportCsv";
import { CsvExportButton } from "@/components/CsvExportButton";

const entityDot: Record<string, string> = {
  task: "bg-accent",
  milestone: "bg-success",
  member: "bg-muted-foreground",
  evidence: "bg-accent",
  payment: "bg-success",
  project: "bg-muted-foreground",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const time = format(d, "HH:mm");
  if (isToday(d)) return `today ${time}`;
  if (isYesterday(d)) return `yesterday ${time}`;
  return `${format(d, "d MMM")} ${time}`;
}

function describeChange(c: ProjectChange): string {
  const who = c.changed_by_name
    ? c.changed_by_name.split("@")[0].replace(/\./g, " ")
    : "someone";
  const entity = c.entity_name ?? c.entity_type;

  switch (c.change_type) {
    case "created":
      return `${who} created ${entity}`;
    case "approved":
      return `${who} approved ${entity}`;
    case "rejected":
      return `${who} rejected ${entity}`;
    case "assigned": {
      const to = (c.new_value?.name as string) ?? "someone";
      return `${who} assigned ${entity} to ${to}`;
    }
    case "shifted": {
      const oldDate = c.old_value?.due_date as string | undefined;
      const newDate = c.new_value?.due_date as string | undefined;
      if (oldDate && newDate) {
        const fmtOld = format(new Date(oldDate), "d MMM");
        const fmtNew = format(new Date(newDate), "d MMM");
        return `due date shifted from ${fmtOld} to ${fmtNew}`;
      }
      return `${who} shifted ${entity}`;
    }
    case "updated": {
      const oldS = c.old_value?.status as string | undefined;
      const newS = c.new_value?.status as string | undefined;
      if (oldS && newS)
        return `${who} updated ${entity}: ${oldS.replace("_", " ")} → ${newS.replace("_", " ")}`;
      const oldDate = c.old_value?.due_date as string | undefined;
      const newDate = c.new_value?.due_date as string | undefined;
      if (oldDate && newDate) {
        const fmtOld = format(new Date(oldDate), "d MMM");
        const fmtNew = format(new Date(newDate), "d MMM");
        return `${who} shifted ${entity} from ${fmtOld} to ${fmtNew}`;
      }
      return `${who} updated ${entity}`;
    }
    case "completed":
      return `${who} completed ${entity}`;
    case "deleted":
      return `${who} deleted ${entity}`;
    case "disputed": {
      const reason = (c.new_value as Record<string, unknown> | null)?.reason as string | undefined;
      return reason ? `${who} raised dispute on ${entity}: ${reason}` : `${who} raised dispute on ${entity}`;
    }
    case "authorized":
      return `${who} authorized payment for ${entity}`;
    case "viewed":
      return `${who} viewed evidence on ${entity}`;
    case "downloaded":
      return `${who} downloaded ${entity}`;
    case "evidence_submitted": {
      const count = (c.new_value as Record<string, unknown> | null)?.photo_count;
      return `${who} submitted ${count ?? ""} evidence for ${entity}`;
    }
    default:
      return `${who} — ${c.change_type} on ${entity}`;
  }
}

export default function ProjectActivity() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: changes = [], isLoading } = useProjectChanges(currentProjectId ?? undefined);
  const { data: user } = useCurrentUser();
  const { role } = useRole();
  const { data: members = [] } = useProjectMembers(currentProjectId ?? undefined);
  const { data: project } = useProject(currentProjectId ?? undefined);
  const [timedOut, setTimedOut] = useState(false);
  const [page, setPage] = useState(0);
  const [hideViews, setHideViews] = useState(false);
  const PAGE_SIZE = 30;

  // Fetch tasks and milestone assignments for role-based filtering
  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ["all-project-tasks", currentProjectId],
    enabled: !!currentProjectId && (role === "contractor" || role === "trade"),
    queryFn: async () => {
      const { data: milestones } = await supabase
        .from("milestones")
        .select("id")
        .eq("project_id", currentProjectId!);
      if (!milestones?.length) return [];
      const milestoneIds = milestones.map(m => m.id);
      const { data: tasks } = await (supabase as any)
        .from("tasks")
        .select("id, milestone_id, assigned_to")
        .in("milestone_id", milestoneIds);
      return (tasks ?? []) as { id: string; milestone_id: string; assigned_to: string | null }[];
    },
  });

  const { data: myMilestoneAssignments = [] } = useQuery({
    queryKey: ["my-milestone-assignments", currentProjectId, user?.id],
    enabled: !!currentProjectId && !!user && (role === "trade" || role === "contractor"),
    queryFn: async () => {
      const { data } = await supabase
        .from("milestone_assignments")
        .select("milestone_id")
        .eq("user_id", user!.id);
      return (data ?? []).map(r => r.milestone_id);
    },
  });

  useEffect(() => {
    const t = setTimeout(() => {
      if (!currentProjectId) setTimedOut(true);
    }, 2000);
    return () => clearTimeout(t);
  }, [currentProjectId]);

  const filteredChanges = useMemo(() => {
    if (!user) return [];

    // PM — see everything including evidence views/downloads (with optional hide-views toggle)
    if (role === "pm") {
      return hideViews ? changes.filter(c => c.change_type !== "viewed") : changes;
    }

    // Contractor — see everything except other people's view events (noise)
    if (role === "contractor") {
      return changes.filter(c =>
        !(c.change_type === "viewed" && c.changed_by !== user.id)
      );
    }

    // Client — only approvals, payment releases, and own actions
    if (role === "client") {
      return changes.filter(c =>
        c.change_type === "approved" ||
        c.change_type === "released" ||
        c.change_type === "authorized" ||
        c.changed_by === user.id
      );
    }

    // Trade — see changes on milestones/tasks they are assigned to
    const userId = user.id;
    const myMilestoneIds = new Set(myMilestoneAssignments);

    // Also include milestones where user has an assigned task
    const myTaskMilestoneIds = new Set(
      allProjectTasks
        .filter(t => t.assigned_to === userId)
        .map(t => t.milestone_id)
    );
    const myTaskIds = new Set(
      allProjectTasks
        .filter(t => t.assigned_to === userId)
        .map(t => t.id)
    );

    // All task IDs on milestones the trade is connected to (to see sibling activity)
    const connectedMilestoneIds = new Set([...myMilestoneIds, ...myTaskMilestoneIds]);
    const connectedTaskIds = new Set(
      allProjectTasks
        .filter(t => connectedMilestoneIds.has(t.milestone_id))
        .map(t => t.id)
    );

    return changes.filter(c => {
      // Own changes always visible
      if (c.changed_by === userId) return true;
      // Milestone changes on connected milestones
      if (c.entity_type === "milestone" && c.entity_id && connectedMilestoneIds.has(c.entity_id)) return true;
      // Task changes on connected milestones
      if (c.entity_type === "task" && c.entity_id && connectedTaskIds.has(c.entity_id)) return true;
      // Evidence on connected milestones
      if (c.entity_type === "evidence" && c.entity_id && connectedMilestoneIds.has(c.entity_id)) return true;
      return false;
    });
  }, [changes, role, user, myMilestoneAssignments, allProjectTasks, hideViews]);

  const showLoading = (isLoading && !!currentProjectId) && !timedOut;
  const showEmpty = (!showLoading && filteredChanges.length === 0) || (!currentProjectId && timedOut);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-32">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-6">← back</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-[22px] leading-tight text-foreground">activity</h1>
          <p className="font-mono text-[11px] text-muted-foreground mt-1 mb-8">full audit trail</p>
        </div>
        {role === "pm" && filteredChanges.length > 0 && (
          <CsvExportButton
            onExport={(range) => exportAuditTrail(filteredChanges, project?.name ?? "project", range)}
            className="font-mono text-[10px] text-muted-foreground underline underline-offset-4"
          />
        )}
      </div>

      {showLoading && (
        <p className="font-mono text-[12px] text-muted-foreground">loading…</p>
      )}

      {showEmpty && (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-sans text-[15px] text-muted-foreground text-center leading-relaxed max-w-[260px]">
            no activity yet — changes to milestones, tasks, and team members will appear here
          </p>
        </div>
      )}

      {(() => {
        const totalPages = Math.max(1, Math.ceil(filteredChanges.length / PAGE_SIZE));
        const paged = filteredChanges.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        return (
          <>
            <div className="space-y-5">
              {paged.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px] ${entityDot[c.entity_type] ?? "bg-muted-foreground"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[14px] text-foreground leading-snug">{describeChange(c)}</p>
                    {(c.new_value as Record<string, unknown> | null)?.ai_comment && (
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {String((c.new_value as Record<string, unknown>).ai_comment)}
                      </p>
                    )}
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{formatTimestamp(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="font-mono text-[11px] text-muted-foreground disabled:opacity-30">← prev</button>
                <span className="font-mono text-[11px] text-muted-foreground">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="font-mono text-[11px] text-muted-foreground disabled:opacity-30">next →</button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
