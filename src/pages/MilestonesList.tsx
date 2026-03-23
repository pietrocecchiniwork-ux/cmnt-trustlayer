import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { MilestoneFlipCard } from "@/components/MilestoneFlipCard";

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
          <MilestoneFlipCard key={m.id} milestone={m} />
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
