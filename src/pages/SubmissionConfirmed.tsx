import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useUpdateMilestoneStatus, useCurrentUser } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function SubmissionConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const milestoneId = searchParams.get("milestoneId") ?? "";
  const { currentProjectId } = useProjectContext();
  const updateStatus = useUpdateMilestoneStatus();
  const { data: user } = useCurrentUser();

  const freshCountParam = searchParams.get("freshCount");
  const evidenceCode = searchParams.get("evidenceCode");

  const [evidenceCount, setEvidenceCount] = useState<number | null>(
    freshCountParam !== null ? parseInt(freshCountParam, 10) : null
  );
  const [requiredCount, setRequiredCount] = useState<number>(1);
  const [nextTaskName, setNextTaskName] = useState<string | null>(null);
  const [nextTaskId, setNextTaskId] = useState<string | null>(null);
  const [milestoneStatus, setMilestoneStatus] = useState("");
  const [autoUpdated, setAutoUpdated] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  useEffect(() => {
    if (!milestoneId || !user) return;

    // Fresh evidence count
    supabase
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("milestone_id", milestoneId)
      .then(({ count, error }) => {
        if (error) console.error("Fresh evidence count error:", error);
        setEvidenceCount(count ?? 0);
      });

    // Milestone status
    supabase
      .from("milestones")
      .select("status")
      .eq("id", milestoneId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("Milestone fetch error:", error);
        if (data) setMilestoneStatus(data.status);
      });

    // Find next incomplete task assigned to current user
    db
      .from("tasks")
      .select("id, name, status, position, assigned_to")
      .eq("milestone_id", milestoneId)
      .order("position", { ascending: true })
      .then(({ data: tasks, error }: { data: { id: string; name: string; status: string; position: number; assigned_to: string | null }[] | null; error: unknown }) => {
        if (error) { console.error("Tasks fetch error:", error); return; }
        const all = tasks ?? [];
        setRequiredCount(all.length || 1);
        // Find next incomplete task (prefer ones assigned to current user)
        const myIncomplete = all.find(t => t.status !== "complete" && t.assigned_to === user.id);
        const anyIncomplete = all.find(t => t.status !== "complete");
        const next = myIncomplete ?? anyIncomplete ?? null;
        setNextTaskName(next?.name ?? null);
        setNextTaskId(next?.id ?? null);
      });
  }, [milestoneId, user]);

  const allSubmitted = evidenceCount !== null && evidenceCount >= requiredCount;

  useEffect(() => {
    if (
      allSubmitted &&
      milestoneStatus &&
      milestoneStatus !== "in_review" && milestoneStatus !== "complete" &&
      currentProjectId &&
      !autoUpdated
    ) {
      setAutoUpdated(true);
      updateStatus.mutateAsync({
        id: milestoneId,
        status: "in_review",
        projectId: currentProjectId,
      }).catch((err) => console.error("Auto-update to in_review failed:", err));
    }
  }, [allSubmitted, milestoneStatus, currentProjectId, autoUpdated]);

  if (evidenceCount === null) {
    return (
      <div className="flex flex-col h-full bg-background px-6 items-center justify-center">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background px-6 items-center justify-center text-center pb-40">
      <p className="font-mono text-[96px] leading-none tracking-tight text-success">
        {evidenceCount}
      </p>
      <p className="font-sans text-[20px] text-muted-foreground mt-2">
        {allSubmitted ? "evidence complete" : `of ${requiredCount} submitted`}
      </p>
      {evidenceCode && (
        <p className="font-mono text-[11px] text-muted-foreground mt-1">{evidenceCode}</p>
      )}

      <div className="divider mt-8 mb-6 w-full" />

      {allSubmitted ? (
        <div>
          <p className="font-mono text-[10px] text-success mb-2">✓ all evidence submitted</p>
          <p className="font-sans text-[14px] text-foreground">all done — awaiting PM review</p>
        </div>
      ) : nextTaskName ? (
        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-2">next up</p>
          <p className="font-sans text-[14px] text-foreground">{nextTaskName}</p>
        </div>
      ) : (
        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-2">still needed</p>
          <p className="font-sans text-[14px] text-foreground">
            {requiredCount - evidenceCount} more item{requiredCount - evidenceCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Fixed action buttons */}
      <div
        className="fixed bottom-16 left-0 right-0 px-6 bg-background space-y-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
      >
        {!allSubmitted && milestoneId && nextTaskId && (
          <Button
            variant="dark"
            size="full"
            onClick={() =>
              navigate(
                `/project/camera?milestoneId=${milestoneId}&item=${encodeURIComponent(nextTaskName ?? "")}&taskId=${nextTaskId}`
              )
            }
          >
            <span className="font-sans text-[16px]">submit next</span>
          </Button>
        )}
        <Button
          variant={allSubmitted ? "dark" : "outline"}
          size="full"
          onClick={() =>
            allSubmitted
              ? navigate("/project/dashboard")
              : milestoneId
                ? navigate(`/project/milestone/${milestoneId}`)
                : navigate("/project/dashboard")
          }
        >
          <span className="font-sans text-[16px]">
            {allSubmitted ? "back to project" : "back to milestone"}
          </span>
        </Button>
      </div>
    </div>
  );
}
