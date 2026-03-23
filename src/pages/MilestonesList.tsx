import { useNavigate } from "react-router-dom";
import { useDemoProject } from "@/contexts/DemoProjectContext";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-accent",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

export default function MilestonesList() {
  const navigate = useNavigate();
  const { currentProject } = useDemoProject();
  const { role } = useRole();

  if (!currentProject) return null;

  const milestones = role === "contractor"
    ? currentProject.milestones.filter(m => m.assignedRole === "contractor" || m.assignedRole === "trade")
    : currentProject.milestones;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-6">
        {role === "contractor" ? "my tasks" : "milestones"}
      </h1>

      <div className="flex-1 space-y-0">
        {milestones.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/project/milestone/${m.id}`)}
            className="w-full flex items-center justify-between py-4 border-b border-border text-left"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[16px] text-muted-foreground">{String(m.position).padStart(2, "0")}</span>
              <div>
                <p className="font-sans text-[14px] text-foreground">{m.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{m.dueDate} · £{m.paymentValue.toLocaleString()}</p>
              </div>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass[m.status]}`} />
          </button>
        ))}
      </div>

      {role === "pm" && (
        <Button variant="dark" size="full" className="mt-4" onClick={() => navigate("/manual-milestone")}>
          <span className="font-sans text-[16px]">add milestone</span>
        </Button>
      )}
    </div>
  );
}
