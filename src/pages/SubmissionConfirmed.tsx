import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useUpdateMilestoneStatus } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function SubmissionConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const milestoneId = searchParams.get("milestoneId") ?? "";
  const { currentProjectId } = useProjectContext();
  const updateStatus = useUpdateMilestoneStatus();

  const freshCountParam = searchParams.get("freshCount");

  const [evidenceCount, setEvidenceCount] = useState<number | null>(
    freshCountParam !== null ? parseInt(freshCountParam, 10) : null
  );
  const [requiredCount, setRequiredCount] = useState<number>(1);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState("");
  const [autoUpdated, setAutoUpdated] = useState(false);

  // Fresh DB queries on mount — no cache
  useEffect(() => {
    if (!milestoneId) return;

    // 1. Fresh evidence count
    supabase
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("milestone_id", milestoneId)
      .then(({ count, error }) => {
        if (error) console.error("Fresh evidence count error:", error);
        setEvidenceCount(count ?? 0);
      });

    // 2. Fresh milestone record for checklist + status
    supabase
      .from("milestones")
      .select("name, status, checklist")
      .eq("id", milestoneId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("Fresh milestone fetch error:", error);
        if (data) {
          setMilestoneName(data.name);
          setMilestoneStatus(data.status);
          const cl: string[] = Array.isArray(data.checklist) ? data.checklist as string[] : [];
          setChecklist(cl);
          setRequiredCount(cl.length || 1);
        }
      });
  }, [milestoneId]);

  const allSubmitted = evidenceCount !== null && evidenceCount >= requiredCount;
  const nextItemName = evidenceCount !== null ? checklist[evidenceCount] ?? null : null;

  // Auto-update milestone to in_review when all evidence is submitted
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
      <div className="flex flex-col min-h-screen bg-background px-6 items-center justify-center">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 items-center justify-center text-center">
      <p className="font-mono text-[96px] leading-none tracking-tight text-success">
        {evidenceCount}
      </p>
      <p className="font-sans text-[20px] text-muted-foreground mt-2">
        {allSubmitted ? "evidence complete" : `of ${requiredCount} submitted`}
      </p>

      <div className="divider mt-8 mb-6 w-full" />

      {allSubmitted ? (
        <div>
          <p className="font-mono text-[10px] text-success mb-2">✓ all evidence submitted</p>
          <p className="font-sans text-[14px] text-foreground">awaiting PM review</p>
        </div>
      ) : (
        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-2">still needed</p>
          {nextItemName ? (
            <p className="font-sans text-[14px] text-foreground">{nextItemName}</p>
          ) : (
            <p className="font-sans text-[14px] text-foreground">
              {requiredCount - evidenceCount} more item{requiredCount - evidenceCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      <div className="w-full mt-auto pb-6 space-y-3">
        {!allSubmitted && milestoneId && (
          <Button
            variant="dark"
            size="full"
            onClick={() => navigate(`/project/camera?milestoneId=${milestoneId}&item=${encodeURIComponent(nextItemName ?? "")}`)}
          >
            <span className="font-sans text-[16px]">submit next item</span>
          </Button>
        )}
        <Button
          variant={allSubmitted ? "dark" : "outline"}
          size="full"
          onClick={() =>
            milestoneId
              ? navigate(`/project/milestone/${milestoneId}`)
              : navigate("/project/dashboard")
          }
        >
          <span className="font-sans text-[16px]">back to milestone</span>
        </Button>
      </div>
    </div>
  );
}
