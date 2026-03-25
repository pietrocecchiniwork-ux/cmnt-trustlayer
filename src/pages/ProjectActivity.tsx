import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectChanges, useCurrentUser, useProjectMembers } from "@/hooks/useSupabaseProject";
import type { ProjectChange } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";

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
  const [timedOut, setTimedOut] = useState(false);

  // Fetch all tasks across all milestones for this project (for assignment-based filtering)
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
        .select("id, assigned_to")
        .in("milestone_id", milestoneIds);
      return (tasks ?? []) as { id: string; assigned_to: string | null }[];
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

    // PM and client: see everything
    if (role === "pm" || role === "client") return changes;

    const userId = user.id;

    if (role === "contractor") {
      // Get user IDs of contractor + trade members
      const teamUserIds = new Set(
        members
          .filter(m => m.role === "contractor" || m.role === "trade")
          .map(m => m.user_id)
          .filter(Boolean)
      );
      teamUserIds.add(userId);

      // Get task IDs assigned to contractor/trade users
      const teamTaskIds = new Set(
        allProjectTasks
          .filter(t => t.assigned_to && teamUserIds.has(t.assigned_to))
          .map(t => t.id)
      );

      return changes.filter(c => {
        // Own changes
        if (c.changed_by === userId) return true;
        // All milestone changes
        if (c.entity_type === "milestone") return true;
        // Task changes for team tasks
        if (c.entity_type === "task" && c.entity_id && teamTaskIds.has(c.entity_id)) return true;
        return false;
      });
    }

    // Trade: only own activity + tasks assigned to them
    const myTaskIds = new Set(
      allProjectTasks
        .filter(t => t.assigned_to === userId)
        .map(t => t.id)
    );

    return changes.filter(c => {
      if (c.changed_by === userId) return true;
      if (c.entity_type === "task" && c.entity_id && myTaskIds.has(c.entity_id)) return true;
      return false;
    });
  }, [changes, role, user, members, allProjectTasks]);

  const showLoading = (isLoading && !!currentProjectId) && !timedOut;
  const showEmpty = (!showLoading && filteredChanges.length === 0) || (!currentProjectId && timedOut);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-32">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-6">← back</button>
      <h1 className="font-sans text-[22px] leading-tight text-foreground">activity</h1>
      <p className="font-mono text-[11px] text-muted-foreground mt-1 mb-8">full audit trail</p>

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

      <div className="space-y-5">
        {filteredChanges.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px] ${entityDot[c.entity_type] ?? "bg-muted-foreground"}`}
            />
            <div className="flex-1 min-w-0">
              <p className="font-sans text-[14px] text-foreground leading-snug">{describeChange(c)}</p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{formatTimestamp(c.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
