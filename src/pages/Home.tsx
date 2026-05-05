import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjects, useMilestones } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Home() {
  const navigate = useNavigate();
  const { currentProjectId, setCurrentProjectId } = useProjectContext();
  const { data: projects = [], isLoading, refetch } = useProjects();
  const [seeding, setSeeding] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (user.email) {
        await supabase.rpc("claim_invitations_for_user", {
          _user_id: user.id,
          _email: user.email,
        }).then(({ error }) => {
          if (error) console.error("Auto-claim invitations failed:", error);
        });
      }
      setAuthed(true);
    });
  }, [navigate]);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-project");
      if (error) throw error;
      setCurrentProjectId(data.project_id);
      await refetch();
      toast.success("Demo project loaded");
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Seed demo error:", err);
      toast.error("Failed to load demo project");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (isLoading || !authed) return;
    if (projects.length === 0) {
      navigate("/onboarding");
      return;
    }
    // Auto-select first project if none selected
    const selectedProject = projects.find((p) => p.id === currentProjectId) ?? projects[0];
    if (selectedProject && selectedProject.id !== currentProjectId) {
      setCurrentProjectId(selectedProject.id);
    }
  }, [isLoading, authed, projects, currentProjectId, setCurrentProjectId, navigate]);

  if (authed === null || isLoading) return null;

  // Filter out cancelled projects
  const activeProjects = projects.filter((p) => !(p as any).cancelled_at);

  return (
    <div className="flex flex-col min-h-screen bg-background px-5 pt-12 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <span className="font-mono text-[14px] text-background">C</span>
          </div>
          <p className="font-sans text-[18px] text-foreground tracking-[-0.02em] lowercase">cemento</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-card rounded-3xl px-6 py-5 mb-4">
        <p className="t-eyebrow">active projects</p>
        <p className="font-sans text-[44px] leading-none tracking-[-0.03em] text-foreground mt-1">
          {String(activeProjects.length).padStart(2, "0")}
        </p>
      </div>

      {/* Project cards */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {activeProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={project.id === currentProjectId}
            onSelect={() => {
              setCurrentProjectId(project.id);
              navigate("/project/dashboard");
            }}
          />
        ))}

        {activeProjects.length === 0 && !isLoading && (
          <div className="bg-card rounded-3xl py-10 text-center">
            <p className="t-label">no active projects</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="space-y-2.5 mt-6">
        {activeProjects.length === 0 && (
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="w-full h-12 bg-foreground text-background rounded-full font-sans text-[14px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {seeding ? "loading demo…" : "load demo project"}
          </button>
        )}
        <button
          onClick={() => navigate("/create-project")}
          className={`w-full h-12 rounded-full font-sans text-[14px] font-medium transition-colors ${
            activeProjects.length === 0
              ? "bg-secondary text-foreground hover:bg-secondary/80"
              : "bg-foreground text-background hover:bg-foreground/90"
          }`}
        >
          new project
        </button>
        <button
          onClick={() => navigate("/join")}
          className="w-full h-10 text-muted-foreground rounded-full font-mono text-[12px] hover:text-foreground transition-colors"
        >
          join a project →
        </button>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isSelected,
  onSelect,
}: {
  project: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: milestones = [] } = useMilestones(project.id);

  const completed = milestones.filter((m) => m.status === "complete").length;
  const total = milestones.length;
  const overdue = milestones.filter((m) => m.status === "overdue").length;
  const inReview = milestones.filter((m) => m.status === "in_review").length;
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  const releasedBudget = milestones
    .filter((m) => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);
  const totalBudget = Number(project.total_budget ?? 0);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-5 bg-card rounded-3xl transition-all active:scale-[0.99] ${
        isSelected ? "ring-2 ring-foreground/15" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[17px] text-foreground tracking-[-0.01em] truncate">{project.name}</p>
          {project.project_code && (
            <p className="t-eyebrow mt-1">{project.project_code}</p>
          )}
        </div>
        <span className="font-mono text-[14px] text-muted-foreground flex-shrink-0">→</span>
      </div>

      <div className="mt-4 w-full h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-foreground transition-all duration-500 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center gap-4 mt-3">
        <span className="font-mono text-[11px] text-muted-foreground">
          {completed}/{total} milestones
        </span>
        {totalBudget > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">
            £{releasedBudget.toLocaleString()} / £{totalBudget.toLocaleString()}
          </span>
        )}
      </div>

      {(overdue > 0 || inReview > 0) && (
        <div className="flex items-center gap-3 mt-3">
          {overdue > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              <span className="font-mono text-[10px] text-destructive">{overdue} overdue</span>
            </span>
          )}
          {inReview > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[10px] text-accent">{inReview} in review</span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}
