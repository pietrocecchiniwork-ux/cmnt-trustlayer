import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDemoProject } from "@/contexts/DemoProjectContext";

export default function SubmitEvidence() {
  const navigate = useNavigate();
  const { currentProject } = useDemoProject();

  const activeMilestones = currentProject?.milestones.filter(
    m => m.status === "in_progress" || m.status === "overdue"
  ) || [];

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-6">submit evidence</h1>

      <p className="font-mono text-[10px] text-muted-foreground mb-4">select milestone</p>

      <div className="flex-1">
        {activeMilestones.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate("/project/camera")}
            className="w-full flex items-center justify-between py-4 border-b border-border text-left"
          >
            <div>
              <p className="font-sans text-[14px] text-foreground">{m.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{m.dueDate}</p>
            </div>
            <span className="font-mono text-[14px] text-muted-foreground">→</span>
          </button>
        ))}

        {activeMilestones.length === 0 && (
          <p className="font-sans text-[14px] text-muted-foreground mt-4">no active milestones to submit evidence for</p>
        )}
      </div>
    </div>
  );
}
