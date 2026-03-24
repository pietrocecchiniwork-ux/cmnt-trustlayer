import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DitheredCircle } from "@/components/DitheredCircle";

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-foreground",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

export default function PMDashboard() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { role } = useRole();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);

  const [isAnon, setIsAnon] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.is_anonymous) setIsAnon(true);
    });
  }, []);

  const handleExitDemo = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

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
    <div className="flex flex-col min-h-screen screen-orange">
     <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] opacity-70">✳</span>
          {isAnon ? (
            <button
              onClick={handleExitDemo}
              className="font-mono text-[11px] opacity-70 hover:opacity-100 transition-opacity"
            >
              exit demo
            </button>
          ) : (
            <span className="font-mono text-[16px] opacity-70">—</span>
          )}
        </div>

        <div className="flex items-baseline gap-3 mt-6">
          <p className="font-mono text-[28px] tracking-tight">
            {project.name?.toLowerCase()}
          </p>
          <button
            onClick={() => navigate("/project/team")}
            className="font-mono text-[11px] opacity-50 hover:opacity-100 transition-opacity"
          >
            team
          </button>
        </div>
      </div>

      {/* Dithered progress circle */}
      <div className="flex justify-center py-10">
        <DitheredCircle
          size={220}
          label="milestones"
          value={`${completed}/${total}`}
          sublabel="complete"
        />
      </div>

      {/* Progress bar */}
      <div className="px-6">
        <div className="w-full h-px bg-foreground/20 relative">
          <div
            className="h-px bg-foreground absolute left-0 top-0 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Overdue alert */}
      {overdueMilestone && role === "pm" && (
        <button
          onClick={() => navigate("/project/cascade-review")}
          className="mx-6 mt-4 flex items-center gap-3 py-3 border-b border-foreground/20 text-left"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
          <span className="font-mono text-[12px] flex-1">
            {overdueMilestone.name?.toLowerCase()} · overdue
          </span>
          <span className="font-mono text-[14px]">↓</span>
        </button>
      )}

      {/* Milestone list */}
      <div className="flex-1 px-6 mt-6 pb-6">
        <div className="space-y-0">
          {milestones.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/project/milestone/${m.id}`)}
              className="w-full flex items-center justify-between py-4 border-b border-foreground/15 text-left group"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-[18px] opacity-40 group-hover:opacity-100 transition-opacity">
                  {String(m.position).padStart(2, "0")}
                </span>
                <span className="font-mono text-[13px]">{m.name?.toLowerCase()}</span>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass[m.status]}`} />
            </button>
          ))}
        </div>
      </div>
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
  return (
    <div className="flex flex-col min-h-screen screen-cream">
      <div className="px-6 pt-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[14px]">←</span>
          <span className="font-mono text-[16px]">—</span>
        </div>
      </div>

      <div className="flex justify-center py-12">
        <DitheredCircle
          size={240}
          label="released"
          value={`£${(releasedBudget / 1000).toFixed(0)}k`}
          sublabel="total balance"
        />
      </div>

      {/* Step chart area */}
      <div className="px-6 flex-1">
        <StepChart milestones={milestones} />
      </div>

      {/* Bottom nav labels */}
      <div className="px-6 pb-6 pt-4">
        <div className="flex justify-around">
          <span className="font-mono text-[12px] opacity-50">balance</span>
          <span className="font-mono text-[12px] opacity-50">budget</span>
          <span className="font-mono text-[12px] border-b border-foreground pb-0.5">expenses</span>
        </div>
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

  const months = ["feb", "mar", "apr", "may", "jun"];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between mt-2">
        {months.map((m) => (
          <span key={m} className="font-mono text-[10px] uppercase opacity-50">{m}</span>
        ))}
      </div>
    </div>
  );
}
