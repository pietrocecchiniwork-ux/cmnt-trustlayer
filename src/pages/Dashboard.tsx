import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useProjects } from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DitheredCircle } from "@/components/DitheredCircle";
import { useTranslation } from "react-i18next";

export default function PMDashboard() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { role } = useRole();
  const { t } = useTranslation();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { data: allProjects = [] } = useProjects();
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
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  if (!project) return null;

  const completed = milestones.filter((m) => m.status === "complete").length;
  const total = milestones.length;
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  const releasedBudget = milestones
    .filter((m) => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);
  const totalBudget = Number(project.total_budget ?? 0);

  const overdueMilestones = milestones.filter((m) => m.status === "overdue");
  const inReviewMilestones = milestones.filter((m) => m.status === "in_review");

  // Find last updated milestone (most recent created_at as proxy)
  const lastUpdated = milestones.length > 0
    ? [...milestones].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
                {t("auth.sign_out")}
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
              {t("navigation.team")} →
            </button>
          </div>

          {/* Project count */}
          <p className="font-mono text-[11px] text-muted-foreground mt-1">
            {allProjects.length} project{allProjects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Dithered progress circle */}
        <div className="flex justify-center py-10">
          <DitheredCircle
            size={220}
            label={t("navigation.milestones")}
            value={`${completed}/${total}`}
            sublabel={t("milestone.status.complete")}
          />
        </div>

        {/* View milestones link */}
        <div className="px-6">
          <button
            onClick={() => navigate("/project/milestones")}
            className="w-full py-3 font-mono text-[13px] text-foreground border border-foreground/20 hover:border-foreground/40 transition-colors text-center"
          >
            {t("navigation.milestones")} →
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 mt-6">
          <div className="w-full h-px bg-foreground/20 relative">
            <div
              className="h-px bg-foreground absolute left-0 top-0 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Budget summary */}
        <div className="px-6 mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">budget released</span>
          <span className="font-mono text-[13px] text-foreground">
            £{releasedBudget.toLocaleString()} / £{totalBudget.toLocaleString()}
          </span>
        </div>

        {/* Alert banners */}
        <div className="px-6 mt-6 space-y-2">
          {overdueMilestones.map((m) => (
            <button
              key={m.id}
              onClick={() => role === "pm" ? navigate("/project/cascade-review") : navigate(`/project/milestone/${m.id}`)}
              className="w-full flex items-center gap-3 py-3 border border-destructive/30 bg-destructive/5 text-left px-4"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
              <span className="font-mono text-[12px] text-destructive flex-1">
                {m.name?.toLowerCase()} · {t("milestone.status.overdue")}
              </span>
            </button>
          ))}
          {inReviewMilestones.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/project/milestone/${m.id}`)}
              className="w-full flex items-center gap-3 py-3 border border-accent/30 bg-accent/5 text-left px-4"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <span className="font-mono text-[12px] text-accent flex-1">
                {m.name?.toLowerCase()} · {t("milestone.status.in_review")}
              </span>
            </button>
          ))}
        </div>

        {/* Last updated milestone */}
        {lastUpdated && (
          <div className="px-6 mt-6">
            <p className="font-mono text-[10px] text-muted-foreground mb-1">last updated</p>
            <button
              onClick={() => navigate(`/project/milestone/${lastUpdated.id}`)}
              className="font-mono text-[12px] text-foreground hover:opacity-70 transition-opacity"
            >
              {lastUpdated.name?.toLowerCase()} →
            </button>
          </div>
        )}

        <div className="flex-1" />
      </div>
    </div>
  );
}
