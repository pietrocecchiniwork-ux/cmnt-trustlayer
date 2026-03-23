import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjects } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-accent",
  complete: "bg-success",
  pending: "bg-muted-foreground",
};

export default function Home() {
  const navigate = useNavigate();
  const { setCurrentProjectId } = useProjectContext();
  const { data: projects = [], isLoading, refetch } = useProjects();
  const [seeding, setSeeding] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else setAuthed(true);
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

  if (authed === null) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[18px] text-foreground">cemento</p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/auth");
          }}
          className="font-mono text-[12px] text-muted-foreground"
        >
          sign out
        </button>
      </div>

      <p className="font-mono text-[96px] leading-none tracking-tight text-foreground mt-6">
        {String(projects.length).padStart(2, "0")}
      </p>
      <p className="font-sans text-[18px] text-muted-foreground mt-1">projects</p>

      <div className="divider mt-6" />

      <div className="flex-1 mt-4">
        {isLoading && (
          <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
        )}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              setCurrentProjectId(project.id);
              navigate("/project/dashboard");
            }}
            className="w-full flex items-center justify-between py-4 border-b border-border text-left"
          >
            <span className="font-sans text-[16px] text-foreground">{project.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColors.active}`} />
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {!isLoading && projects.length === 0 && (
          <Button
            variant="dark"
            size="full"
            onClick={handleSeedDemo}
            disabled={seeding}
          >
            <span className="font-sans text-[16px]">
              {seeding ? "loading demo..." : "load demo project"}
            </span>
          </Button>
        )}

        <Button
          variant={projects.length === 0 ? "outline" : "dark"}
          size="full"
          onClick={() => navigate("/create-project")}
        >
          <span className="font-sans text-[16px]">new project</span>
        </Button>
      </div>
    </div>
  );
}
