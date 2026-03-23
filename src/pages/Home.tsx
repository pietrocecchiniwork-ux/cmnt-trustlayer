import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDemoProject } from "@/contexts/DemoProjectContext";

const statusColors: Record<string, string> = {
  active: "bg-accent",
  complete: "bg-success",
  pending: "bg-muted-foreground",
};

export default function Home() {
  const navigate = useNavigate();
  const { projects, setCurrentProject } = useDemoProject();

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      {/* Header */}
      <p className="font-mono text-[18px] text-foreground">cemento</p>

      {/* Project count */}
      <p className="font-mono text-[96px] leading-none tracking-tight text-foreground mt-6">
        {String(projects.length).padStart(2, "0")}
      </p>
      <p className="font-sans text-[18px] text-muted-foreground mt-1">projects</p>

      {/* Divider */}
      <div className="divider mt-6" />

      {/* Project list */}
      <div className="flex-1 mt-4">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              setCurrentProject(project);
              navigate("/project/dashboard");
            }}
            className="w-full flex items-center justify-between py-4 border-b border-border text-left"
          >
            <span className="font-sans text-[16px] text-foreground">{project.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColors.active}`} />
          </button>
        ))}
      </div>

      {/* New project button */}
      <Button variant="dark" size="full" onClick={() => navigate("/create-project")}>
        <span className="font-sans text-[16px]">new project</span>
      </Button>
    </div>
  );
}
