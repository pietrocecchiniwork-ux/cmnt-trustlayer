import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDemoProject } from "@/contexts/DemoProjectContext";
import { useRole } from "@/contexts/RoleContext";

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

const sampleEvidence = [
  {
    id: "1",
    submitter: "mark t.",
    timestamp: "14 mar 2026 · 09:42",
    tags: ["plumbing", "first fix", "kitchen", "rough-in", "good", "pipework"],
  },
  {
    id: "2",
    submitter: "sarah k.",
    timestamp: "13 mar 2026 · 16:18",
    tags: ["electrical", "first fix", "ground floor", "rough-in", "good", "wiring"],
  },
  {
    id: "3",
    submitter: "mark t.",
    timestamp: "12 mar 2026 · 11:05",
    tags: ["carpentry", "framing", "loft", "structural", "good", "joists"],
  },
];

export default function MilestoneDetailPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useDemoProject();
  const { role } = useRole();

  const milestone = currentProject?.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return null;

  const config = statusConfig[milestone.status];
  const numColor = numberColor[milestone.status];

  // Contractor view for in_progress
  if (role === "contractor" && (milestone.status === "in_progress" || milestone.status === "pending")) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">
          ← back
        </button>

        <p className={`font-mono text-[96px] leading-none tracking-tight ${numColor}`}>
          {String(milestone.position).padStart(2, "0")}
        </p>
        <h1 className="font-sans text-[22px] leading-tight mt-3 text-foreground">{milestone.name}</h1>
        <p className="font-mono text-[13px] text-muted-foreground mt-2">{milestone.dueDate}</p>

        {/* Evidence checklist */}
        <div className="divider mt-6" />
        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">required evidence</p>

        <div className="flex-1 space-y-3">
          {milestone.evidenceRequired.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <span className={`w-4 h-4 rounded-full border ${i < 1 ? "bg-success border-success" : "border-muted-foreground"}`} />
              <span className="font-sans text-[14px] text-foreground">{item}</span>
            </div>
          ))}
        </div>

        <p className="font-mono text-[12px] text-muted-foreground mb-3">submit evidence</p>
        <Button variant="dark" size="full" onClick={() => navigate("/project/camera")}>
          <span className="font-sans text-[16px]">take photo</span>
        </Button>
      </div>
    );
  }

  // PM view (all statuses)
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-4">
          ← back
        </button>

        <p className={`font-mono text-[96px] leading-none tracking-tight ${numColor}`}>
          {String(milestone.position).padStart(2, "0")}
        </p>
        <h1 className="font-sans text-[22px] leading-tight mt-3 text-foreground">{milestone.name}</h1>

        <div className="flex items-center gap-4 mt-3">
          <span className="font-mono text-[13px] text-muted-foreground">{milestone.dueDate}</span>
          <span className="font-mono text-[13px] text-muted-foreground">£{milestone.paymentValue.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
          <span className="font-mono text-[12px] text-muted-foreground">{config.label}</span>
          {milestone.status === "overdue" && (
            <span className="font-mono text-[12px] text-destructive">· +6 days</span>
          )}
        </div>

        <div className="divider mt-6" />

        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">evidence</p>

        <div className="space-y-4">
          {sampleEvidence.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-[52px] h-[52px] bg-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[14px] text-foreground">{item.submitter}</p>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{item.timestamp}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="font-mono text-[10px] text-accent border-b border-accent/40 pb-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {milestone.status === "in_review" && (
        <div className="px-6 pb-6 space-y-3">
          <Button variant="approve" size="full" onClick={() => navigate(-1)}>
            <span className="font-sans text-[16px]">approve</span>
          </Button>
          <Button variant="reject" size="full" onClick={() => navigate(-1)}>
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
