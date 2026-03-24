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
    <div className="flex flex-col min-h-screen bg-background px-6 pt-10 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="font-mono text-[18px] text-foreground">cemento</p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/auth");
          }}
          className="font-mono text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          sign out
        </button>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <p className="font-mono text-[42px] leading-none tracking-tight text-foreground">
          {String(activeProjects.length).padStart(2, "0")}
        </p>
        <p className="font-mono text-[13px] text-muted-foreground mt-1">
          active project{activeProjects.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="w-full h-px bg-border mb-6" />

      {/* Project cards */}
      <div className="flex-1 space-y-4 overflow-y-auto">
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
          <div className="py-8 text-center">
            <p className="font-mono text-[13px] text-muted-foreground">no active projects</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="space-y-3 mt-6">
        {activeProjects.length === 0 && (
          <Button variant="dark" size="full" onClick={handleSeedDemo} disabled={seeding}>
            <span className="font-sans text-[16px]">
              {seeding ? "loading demo..." : "load demo project"}
            </span>
          </Button>
        )}
        <Button
          variant={activeProjects.length === 0 ? "outline" : "dark"}
          size="full"
          onClick={() => navigate("/create-project")}
        >
          <span className="font-sans text-[16px]">new project</span>
        </Button>
        <button
          onClick={() => navigate("/join")}
          className="w-full text-center font-mono text-[13px] text-accent"
        >
          join a project
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
      className={`w-full text-left p-5 border transition-colors ${
        isSelected ? "border-foreground/40" : "border-border hover:border-foreground/20"
      }`}
    >
      {/* Project name and code */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[16px] text-foreground truncate">{project.name}</p>
          {project.project_code && (
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{project.project_code}</p>
          )}
        </div>
        <span className="font-mono text-[12px] text-muted-foreground flex-shrink-0">→</span>
      </div>

      {/* Mini progress bar */}
      <div className="mt-4 w-full h-px bg-border relative">
        <div
          className="h-px bg-foreground absolute left-0 top-0 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stats row */}
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

      {/* Alerts */}
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
