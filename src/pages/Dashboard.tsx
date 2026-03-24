import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function PMDashboard() {
  const navigate = useNavigate();
  const { currentProjectId, setCurrentProjectId } = useProjectContext();
  const { role } = useRole();
  const { t } = useTranslation();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);

  const [isAnon, setIsAnon] = useState(false);
  const [cancelStep, setCancelStep] = useState(0); // 0=hidden, 1=first confirm, 2=final confirm
  const [cancelling, setCancelling] = useState(false);

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

  const [isCreator, setIsCreator] = useState(false);
  useEffect(() => {
    if (!project) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsCreator(user?.id === project.created_by);
    });
  }, [project]);

  const handleCancelProject = async () => {
    if (!currentProjectId) return;
    setCancelling(true);
    try {
      const { error } = await (supabase as any)
        .from("projects")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("id", currentProjectId);
      if (error) throw error;
      toast.success("Project cancelled");
      setCurrentProjectId(null);
      navigate("/");
    } catch (err) {
      console.error("Cancel project error:", err);
      toast.error("Failed to cancel project");
    } finally {
      setCancelling(false);
      setCancelStep(0);
    }
  };

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

  const lastUpdated = milestones.length > 0
    ? [...milestones].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-6 pt-10 pb-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← all projects
            </button>
            {isAnon ? (
              <button
                onClick={handleExitDemo}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-opacity"
              >
                {t("auth.sign_out")}
              </button>
            ) : (
              <span className="font-mono text-[16px] text-muted-foreground">—</span>
            )}
          </div>

          <div className="flex items-baseline gap-3 mt-6">
            <p className="font-mono text-[28px] tracking-tight text-foreground">
              {project.name?.toLowerCase()}
            </p>
            <button
              onClick={() => navigate("/project/team")}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-opacity"
            >
              {t("navigation.team")} →
            </button>
          </div>
          {project.project_code && (
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{project.project_code}</p>
          )}
        </div>

        {/* Compact progress */}
        <div className="px-6 mt-8">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="font-mono text-[42px] leading-none tracking-tight text-foreground">
                {completed}<span className="text-muted-foreground">/{total}</span>
              </p>
              <p className="font-mono text-[11px] text-muted-foreground mt-1">{t("navigation.milestones")} complete</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[13px] text-foreground">
                £{releasedBudget.toLocaleString()}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                of £{totalBudget.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-px bg-border relative">
            <div
              className="h-px bg-foreground absolute left-0 top-0 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* View milestones link */}
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/project/milestones")}
            className="w-full py-3 font-mono text-[13px] text-foreground border border-foreground/20 hover:border-foreground/40 transition-colors text-center"
          >
            {t("navigation.milestones")} →
          </button>
        </div>

        {/* Alert banners */}
        {(overdueMilestones.length > 0 || inReviewMilestones.length > 0) && (
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
        )}

        {/* Last updated */}
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

        {/* Cancel project (creator only) */}
        {isCreator && role === "pm" && (
          <div className="px-6 pb-6">
            {cancelStep === 0 && (
              <button
                onClick={() => setCancelStep(1)}
                className="w-full font-mono text-[11px] text-destructive/60 hover:text-destructive transition-colors text-center py-3"
              >
                cancel project
              </button>
            )}

            {cancelStep === 1 && (
              <div className="border border-destructive/30 p-4 space-y-3">
                <p className="font-mono text-[12px] text-foreground">
                  are you sure you want to cancel this project?
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  this will hide the project from all members. this action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelStep(0)}
                    className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border hover:border-foreground/40 transition-colors"
                  >
                    go back
                  </button>
                  <button
                    onClick={() => setCancelStep(2)}
                    className="flex-1 py-2 font-mono text-[12px] text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors"
                  >
                    yes, cancel
                  </button>
                </div>
              </div>
            )}

            {cancelStep === 2 && (
              <div className="border border-destructive p-4 space-y-3">
                <p className="font-mono text-[13px] text-destructive font-bold">
                  final confirmation
                </p>
                <p className="font-mono text-[11px] text-foreground">
                  type the project name to confirm: <strong>{project.name}</strong>
                </p>
                <CancelConfirmInput
                  projectName={project.name}
                  onConfirm={handleCancelProject}
                  onCancel={() => setCancelStep(0)}
                  cancelling={cancelling}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CancelConfirmInput({
  projectName,
  onConfirm,
  onCancel,
  cancelling,
}: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const [input, setInput] = useState("");
  const matches = input.trim().toLowerCase() === projectName.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder={projectName}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full font-mono text-[13px] bg-transparent border-b border-destructive/40 text-foreground py-2 outline-none placeholder:text-muted-foreground/40"
      />
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border hover:border-foreground/40 transition-colors"
        >
          go back
        </button>
        <button
          onClick={onConfirm}
          disabled={!matches || cancelling}
          className="flex-1 py-2 font-mono text-[12px] text-destructive-foreground bg-destructive border border-destructive disabled:opacity-40 transition-colors"
        >
          {cancelling ? "cancelling..." : "cancel project"}
        </button>
      </div>
    </div>
  );
}
