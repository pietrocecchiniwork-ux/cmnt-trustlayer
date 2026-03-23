import { useState } from "react";
import { MilestoneDetail } from "@/components/MilestoneDetail";

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

type ViewStatus = "in_review" | "overdue";

export default function Index() {
  const [viewStatus, setViewStatus] = useState<ViewStatus>("in_review");

  return (
    <div className="max-w-md mx-auto relative">
      <MilestoneDetail
        number={4}
        name="first fix — electrical and plumbing"
        dueDate="08 mar 2026"
        paymentValue="£11,000"
        status={viewStatus}
        evidence={sampleEvidence}
        onApprove={() => alert("Approved")}
        onReject={() => alert("Rejected")}
      />

      {/* Status toggle for demo */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-surface-dark rounded-full px-1 py-1 flex gap-1">
          {(["in_review", "overdue"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setViewStatus(s)}
              className={`font-mono text-[11px] px-3 py-1.5 rounded-full transition-colors ${
                viewStatus === s
                  ? "bg-accent text-accent-foreground"
                  : "text-surface-dark-foreground/60 hover:text-surface-dark-foreground"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
