import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-accent",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

const statusNumColor: Record<string, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-accent",
  overdue: "text-destructive",
  in_review: "text-accent",
  complete: "text-success",
};

export default function PMDashboard() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { role } = useRole();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    enabled: !!currentProjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", currentProjectId!)
        .single();
      if (error) { console.error("fetch project error:", error); throw error; }
      return data;
    },
  });

  if (!currentProjectId || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
      </div>
    );
  }

  if (!project) return null;

  const completed = milestones.filter((m) => m.status === "complete").length;
  const total = milestones.length;
  const overdueMilestone = milestones.find((m) => m.status === "overdue");
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  const releasedBudget = milestones
    .filter((m) => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  if (role === "client") {
    return <ClientDashboard project={project} completed={completed} total={total} releasedBudget={releasedBudget} milestones={milestones} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-background px-6 pt-12 pb-6">
        <p className="font-mono text-[12px] text-muted-foreground uppercase tracking-wider">{project.name}</p>

        <div className="flex items-baseline gap-3 mt-4">
          <span className="font-mono text-[80px] leading-none tracking-tight text-foreground">{completed}</span>
          <span className="font-mono text-[24px] text-muted-foreground">/</span>
          <span className="font-mono text-[80px] leading-none tracking-tight text-muted-foreground">{total}</span>
        </div>

        <div className="w-full h-px bg-border mt-6 relative">
          <div className="h-px bg-accent absolute left-0 top-0" style={{ width: `${progressPct}%` }} />
        </div>

        {overdueMilestone && role === "pm" && (
          <button
            onClick={() => navigate("/project/cascade-review")}
            className="w-full flex items-center gap-3 mt-4 py-3 text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
            <span className="font-sans text-[13px] text-foreground flex-1">
              {overdueMilestone.name} · overdue
            </span>
            <span className="font-mono text-[14px] text-muted-foreground">→</span>
          </button>
        )}
      </div>

      <div className="flex-1 bg-surface-dark px-6 pt-6 pb-6">
        <div className="space-y-0">
          {milestones.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/project/milestone/${m.id}`)}
              className="w-full flex items-center justify-between py-4 border-b border-surface-dark-muted text-left"
            >
              <div className="flex items-center gap-4">
                <span className={`font-mono text-[20px] ${statusNumColor[m.status]}`}>
                  {String(m.position).padStart(2, "0")}
                </span>
                <span className="font-sans text-[14px] text-surface-dark-foreground">{m.name}</span>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass[m.status]}`} />
            </button>
          ))}
        </div>

        {role === "pm" && (
          <Button variant="light" size="full" className="mt-6" onClick={() => navigate("/manual-milestone")}>
            <span className="font-sans text-[16px]">add milestone</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function ClientDashboard({ project, completed, total, releasedBudget, milestones }: {
  project: any;
  completed: number;
  total: number;
  releasedBudget: number;
  milestones: any[];
}) {
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <p className="font-mono text-[12px] text-muted-foreground uppercase tracking-wider">{project.name}</p>
      <p className="font-mono text-[80px] leading-none tracking-tight text-foreground mt-4">
        {completed}/{total}
      </p>
      <div className="w-full h-px bg-border mt-6 relative">
        <div className="h-px bg-accent absolute left-0 top-0" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="font-mono text-[28px] text-success mt-8">
        £{releasedBudget.toLocaleString()} released
      </p>
      <div className="mt-8 flex-1">
        <StepChart milestones={milestones} />
      </div>
    </div>
  );
}

function StepChart({ milestones }: { milestones: any[] }) {
  const width = 100;
  const height = 60;
  const points: string[] = [];

  milestones.forEach((m, i) => {
    const x = (i / Math.max(milestones.length - 1, 1)) * width;
    const y = m.status === "complete" ? height * 0.2 : height * 0.8;
    if (i === 0) {
      points.push(`${x},${y}`);
    } else {
      const prevY = points[points.length - 1].split(",")[1];
      points.push(`${x},${prevY}`);
      points.push(`${x},${y}`);
    }
  });

  const months = ["jan", "feb", "mar", "apr", "may"];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <polyline points={points.join(" ")} fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between mt-2">
        {months.map((m) => (
          <span key={m} className="font-mono text-[10px] text-muted-foreground uppercase">{m}</span>
        ))}
      </div>
    </div>
  );
}
