import { Button } from "@/components/ui/button";

interface EvidenceItem {
  id: string;
  submitter: string;
  timestamp: string;
  tags: string[];
}

interface MilestoneDetailProps {
  number: number;
  name: string;
  dueDate: string;
  paymentValue: string;
  status: "pending" | "in_progress" | "overdue" | "in_review" | "complete";
  evidence: EvidenceItem[];
  onApprove?: () => void;
  onReject?: () => void;
}

const statusConfig = {
  pending: { label: "pending", dotClass: "status-dot-pending" },
  in_progress: { label: "in progress", dotClass: "status-dot-active" },
  overdue: { label: "overdue", dotClass: "status-dot-overdue" },
  in_review: { label: "in review", dotClass: "status-dot-review" },
  complete: { label: "complete", dotClass: "status-dot-complete" },
};

const numberColorMap: Record<string, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-accent",
  overdue: "text-destructive",
  in_review: "text-accent",
  complete: "text-success",
};

export function MilestoneDetail({
  number,
  name,
  dueDate,
  paymentValue,
  status,
  evidence,
  onApprove,
  onReject,
}: MilestoneDetailProps) {
  const config = statusConfig[status];
  const numberColor = numberColorMap[status];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 px-6 pt-12 pb-6">
        {/* Milestone number */}
        <p className={`font-mono text-[96px] leading-none tracking-tight ${numberColor}`}>
          {String(number).padStart(2, "0")}
        </p>

        {/* Milestone name */}
        <h1 className="font-sans text-[22px] leading-tight mt-3 text-foreground">
          {name}
        </h1>

        {/* Due date and payment */}
        <div className="flex items-center gap-4 mt-3">
          <span className="font-mono text-[13px] text-muted-foreground">{dueDate}</span>
          <span className="font-mono text-[13px] text-muted-foreground">{paymentValue}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mt-4">
          <span className={config.dotClass} />
          <span className="font-mono text-[12px] text-muted-foreground">{config.label}</span>
          {status === "overdue" && (
            <span className="font-mono text-[12px] text-destructive">· +6 days</span>
          )}
        </div>

        {/* Divider */}
        <div className="divider mt-6" />

        {/* Evidence section */}
        <p className="font-mono text-[10px] text-muted-foreground mt-6 mb-4">evidence</p>

        <div className="space-y-4">
          {evidence.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              {/* Thumbnail placeholder */}
              <div className="w-[52px] h-[52px] bg-secondary flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[14px] text-foreground">{item.submitter}</p>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{item.timestamp}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {item.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="font-mono text-[10px] text-accent border-b border-accent/40 pb-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {(status === "in_review") && (
        <div className="px-6 pb-6 space-y-3">
          <Button variant="approve" size="full" onClick={onApprove}>
            <span className="font-sans text-[16px]">approve</span>
          </Button>
          <Button variant="reject" size="full" onClick={onReject}>
            <span className="font-sans text-[16px]">reject</span>
          </Button>
        </div>
      )}

      {status === "overdue" && (
        <div className="px-6 pb-6">
          <Button variant="destructive" size="full" onClick={() => {}}>
            <span className="font-sans text-[16px]">review cascade</span>
          </Button>
        </div>
      )}
    </div>
  );
}
