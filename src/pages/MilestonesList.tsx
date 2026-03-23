import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
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
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { role } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
      </div>
    );
  }

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
                <p className="font-mono text-[11px] text-muted-foreground">
                  {m.due_date ?? "no date"} · £{Number(m.payment_value ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass[m.status]}`} />
          </button>
        ))}
        {milestones.length === 0 && (
          <p className="font-sans text-[14px] text-muted-foreground mt-4">no milestones yet</p>
        )}
      </div>

      {role === "pm" && (
        <Button variant="dark" size="full" className="mt-4" onClick={() => navigate("/manual-milestone")}>
          <span className="font-sans text-[16px]">add milestone</span>
        </Button>
      )}
    </div>
  );
}
