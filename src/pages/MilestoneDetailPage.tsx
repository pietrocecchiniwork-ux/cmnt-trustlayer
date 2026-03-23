import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useEvidence, useUpdateMilestoneStatus } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  pending: { label: "pending", dotClass: "bg-muted-foreground" },
  in_progress: { label: "in progress", dotClass: "bg-accent" },
  overdue: { label: "overdue", dotClass: "bg-destructive" },
  in_review: { label: "in review", dotClass: "bg-accent" },
  complete: { label: "complete", dotClass: "bg-success" },
};

const numberColor: Record<string, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-accent",
  overdue: "text-destructive",
  in_review: "text-accent",
  complete: "text-success",
};

export default function MilestoneDetailPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: evidenceItems = [] } = useEvidence(milestoneId);
  const { role } = useRole();
  const updateStatus = useUpdateMilestoneStatus();

  const milestone = milestones.find((m) => m.id === milestoneId);
  if (!milestone) return null;

  const config = statusConfig[milestone.status];
  const numColor = numberColor[milestone.status];

  const handleApprove = async () => {
    try {
      await updateStatus.mutateAsync({
        id: milestone.id,
        status: "complete",
        projectId: currentProjectId!,
      });
      toast.success("Milestone approved");
      navigate(-1);
    } catch (err) {
      console.error("Approve failed:", err);
      toast.error("Failed to approve milestone");
    }
  };

  const handleReject = async () => {
    try {
      await updateStatus.mutateAsync({
        id: milestone.id,
        status: "in_progress",
        projectId: currentProjectId!,
      });
      toast.success("Milestone rejected — sent back to in progress");
      navigate(-1);
    } catch (err) {
      console.error("Reject failed:", err);
      toast.error("Failed to reject milestone");
    }
  };

  // Contractor view
  if (role === "contractor" && (milestone.status === "in_progress" || milestone.status === "pending" || milestone.status === "overdue")) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">← back</button>
        <p className={`font-mono text-[96px] leading-none tracking-tight ${numColor}`}>
          {String(milestone.position).padStart(2, "0")}
        </p>
        <h1 className="font-sans text-[22px] leading-tight mt-3 text-foreground">{milestone.name}</h1>
        <p className="font-mono text-[13px] text-muted-foreground mt-2">{milestone.due_date ?? "no date"}</p>

        <div className="divider mt-6" />
        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">description</p>
        <p className="font-sans text-[14px] text-foreground mb-6">{milestone.description || "No description"}</p>

        <p className="font-mono text-[10px] text-muted-foreground mb-4">submitted evidence ({evidenceItems.length})</p>
        <div className="flex-1 space-y-3">
          {evidenceItems.map((e) => (
            <div key={e.id} className="flex items-start gap-3 py-2">
              {e.photo_url ? (
                <img src={e.photo_url} alt="evidence" className="w-[44px] h-[44px] object-cover flex-shrink-0" />
              ) : (
                <div className="w-[44px] h-[44px] bg-secondary flex-shrink-0" />
              )}
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {format(new Date(e.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {e.note && <p className="font-sans text-[13px] text-foreground mt-0.5">{e.note}</p>}
              </div>
            </div>
          ))}
        </div>

        <p className="font-mono text-[12px] text-muted-foreground mb-3">submit evidence</p>
        <Button variant="dark" size="full" onClick={() => navigate(`/project/camera?milestoneId=${milestone.id}`)}>
          <span className="font-sans text-[16px]">take photo</span>
        </Button>
      </div>
    );
  }

  // PM view
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">← back</button>

        <p className={`font-mono text-[96px] leading-none tracking-tight ${numColor}`}>
          {String(milestone.position).padStart(2, "0")}
        </p>
        <h1 className="font-sans text-[22px] leading-tight mt-3 text-foreground">{milestone.name}</h1>

        <div className="flex items-center gap-4 mt-3">
          <span className="font-mono text-[13px] text-muted-foreground">{milestone.due_date ?? "no date"}</span>
          <span className="font-mono text-[13px] text-muted-foreground">£{Number(milestone.payment_value ?? 0).toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
          <span className="font-mono text-[12px] text-muted-foreground">{config.label}</span>
        </div>

        <div className="divider mt-6" />
        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">evidence ({evidenceItems.length})</p>

        <div className="space-y-4">
          {evidenceItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              {item.photo_url ? (
                <img src={item.photo_url} alt="evidence" className="w-[52px] h-[52px] object-cover flex-shrink-0" />
              ) : (
                <div className="w-[52px] h-[52px] bg-secondary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {format(new Date(item.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {item.note && <p className="font-sans text-[13px] text-foreground mt-0.5">{item.note}</p>}
                {item.ai_tags && typeof item.ai_tags === "object" && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {Object.values(item.ai_tags as Record<string, string>).map((tag, i) => (
                      <span key={i} className="font-mono text-[10px] text-accent border-b border-accent/40 pb-0.5">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {evidenceItems.length === 0 && (
            <p className="font-sans text-[13px] text-muted-foreground">no evidence submitted yet</p>
          )}
        </div>
      </div>

      {milestone.status === "in_review" && (
        <div className="px-6 pb-6 space-y-3">
          <Button variant="approve" size="full" onClick={handleApprove} disabled={updateStatus.isPending}>
            <span className="font-sans text-[16px]">approve</span>
          </Button>
          <Button variant="reject" size="full" onClick={handleReject} disabled={updateStatus.isPending}>
            <span className="font-sans text-[16px]">reject</span>
          </Button>
        </div>
      )}

      {milestone.status === "overdue" && (
        <div className="px-6 pb-6">
          <Button variant="destructive" size="full" onClick={() => navigate("/project/cascade-review")}>
            <span className="font-sans text-[16px]">review cascade</span>
          </Button>
        </div>
      )}

      {milestone.status === "complete" && (
        <div className="px-6 pb-6">
          <Button variant="dark" size="full" onClick={() => navigate(`/project/payment-certificate/${milestone.id}`)}>
            <span className="font-sans text-[16px]">view payment certificate</span>
          </Button>
        </div>
      )}
    </div>
  );
}
