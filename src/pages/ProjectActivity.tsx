import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectChanges, useCurrentUser, useProjectMembers } from "@/hooks/useSupabaseProject";
import type { ProjectChange } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
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

  // Debug: log project ID on mount
  useEffect(() => {
    console.log("[ProjectActivity] currentProjectId on mount:", currentProjectId);
    // If still null after 2 seconds, treat as no-data (avoid infinite loading)
    const t = setTimeout(() => {
      if (!currentProjectId) {
        console.warn("[ProjectActivity] currentProjectId still null after 2s — showing empty state");
        setTimedOut(true);
      }
    }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Direct RLS check: query project_changes and log any error
  useEffect(() => {
    if (!currentProjectId) return;
    supabase
      .from("project_changes" as never)
      .select("id", { count: "exact", head: true })
      .eq("project_id", currentProjectId)
      .then(({ count, error }) => {
        if (error) console.error("[ProjectActivity] RLS check error:", error);
        else console.log("[ProjectActivity] project_changes count:", count);
      });
  }, [currentProjectId]);

  // Role-based filtering:
  // PM/client → see all activity
  // contractor → see own + trade members' activity
  // trade → see only own activity
  const filteredChanges = useMemo(() => {
    if (!user) return [];
    if (role === "pm" || role === "client") return changes;

    if (role === "contractor") {
      // Get user IDs of trade members in this project
      const tradeUserIds = new Set(
        members.filter(m => m.role === "trade").map(m => m.user_id).filter(Boolean)
      );
      tradeUserIds.add(user.id); // include own
      return changes.filter(c => c.changed_by && tradeUserIds.has(c.changed_by));
    }

    // trade: only own activity
    return changes.filter(c => c.changed_by === user.id);
  }, [changes, role, user, members]);

  // Query is disabled when projectId is null — treat as empty, not loading
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
