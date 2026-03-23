import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useEvidence, useUpdateMilestoneStatus } from "@/hooks/useSupabaseProject";
import { useEffect, useState } from "react";

export default function SubmissionConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const milestoneId = searchParams.get("milestoneId") ?? "";
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: evidenceItems = [] } = useEvidence(milestoneId || undefined);
  const updateStatus = useUpdateMilestoneStatus();
  const [autoUpdated, setAutoUpdated] = useState(false);

  const milestone = milestones.find((m) => m.id === milestoneId);
  const evidenceCount = evidenceItems.length;

  // For now we consider 4 evidence items as "complete" for a milestone
  // This is a simple heuristic — could be replaced with a required_evidence_count column
  const requiredCount = 4;
  const allSubmitted = evidenceCount >= requiredCount;

  // Auto-update milestone to in_review when all evidence is submitted
  useEffect(() => {
    if (
      allSubmitted &&
      milestone &&
      (milestone.status === "in_progress" || milestone.status === "overdue") &&
      currentProjectId &&
      !autoUpdated
    ) {
      setAutoUpdated(true);
      updateStatus.mutateAsync({
        id: milestone.id,
        status: "in_review",
        projectId: currentProjectId,
      }).catch((err) => console.error("Auto-update to in_review failed:", err));
    }
  }, [allSubmitted, milestone, currentProjectId, autoUpdated]);

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
          <p className="font-sans text-[14px] text-foreground">
            {requiredCount - evidenceCount} more evidence item{requiredCount - evidenceCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="w-full mt-auto pb-6 space-y-3">
        {!allSubmitted && milestoneId && (
          <Button
            variant="dark"
            size="full"
            onClick={() => navigate(`/project/camera?milestoneId=${milestoneId}`)}
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
