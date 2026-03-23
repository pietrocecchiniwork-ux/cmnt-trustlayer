import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const affectedMilestones = [
  { name: "plastering and drylining", oldDate: "22 mar 2026", newDate: "28 mar 2026" },
  { name: "second fix and joinery", oldDate: "10 apr 2026", newDate: "16 apr 2026" },
  { name: "decoration and finishing", oldDate: "28 apr 2026", newDate: "04 may 2026" },
];

export default function CascadeReview() {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground">timeline update</h1>
      <p className="font-sans text-[16px] text-muted-foreground mt-3">
        first fix electrical is 6 days overdue. 3 milestones affected.
      </p>

      <div className="divider mt-6 mb-6" />

      {/* Affected milestones table */}
      <div className="space-y-0">
        <div className="flex items-center py-2 border-b border-border">
          <span className="flex-1 font-mono text-[10px] text-muted-foreground">milestone</span>
          <span className="w-24 font-mono text-[10px] text-muted-foreground text-right">old</span>
          <span className="w-24 font-mono text-[10px] text-destructive text-right">new</span>
        </div>
        {affectedMilestones.map((m) => (
          <div key={m.name} className="flex items-center py-3 border-b border-border">
            <span className="flex-1 font-sans text-[14px] text-foreground">{m.name}</span>
            <span className="w-24 font-mono text-[11px] text-muted-foreground text-right line-through decoration-border">
              {m.oldDate}
            </span>
            <span className="w-24 font-mono text-[11px] text-destructive text-right">{m.newDate}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 mt-6">
        <input
          type="text"
          placeholder="reason for delay — required"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="underline-input"
        />
      </div>

      <Button
        variant="dark"
        size="full"
        disabled={!reason.trim()}
        onClick={() => navigate("/project/dashboard")}
      >
        <span className="font-sans text-[16px]">approve revised dates</span>
      </Button>
    </div>
  );
}
