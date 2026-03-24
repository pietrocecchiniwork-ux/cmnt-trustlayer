import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectMembers, useProject } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function TeamScreen() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: members = [], isLoading } = useProjectMembers(currentProjectId ?? undefined);
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { role } = useRole();

  const handleCopyCode = async () => {
    if (!currentProjectId) return;
    try {
      await navigator.clipboard.writeText(currentProjectId);
      toast.success("code copied");
    } catch {
      toast.error("failed to copy");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-6">team</h1>

      <div className="flex-1">
        {isLoading && (
          <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-sans text-[14px] text-foreground">{m.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{m.role}</p>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
          </div>
        ))}

        {members.length === 0 && !isLoading && (
          <p className="font-sans text-[14px] text-muted-foreground mt-4">no team members yet</p>
        )}

        <button
          onClick={() => navigate("/whatsapp-sim")}
          className="w-full py-4 border-b border-border text-left"
        >
          <span className="font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5">whatsapp bot</span>
        </button>

      {role === "pm" && currentProjectId && (
          <div className="mt-10">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">
              project code
            </p>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[14px] text-foreground break-all">{currentProjectId}</p>
              <button
                onClick={handleCopyCode}
                className="font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5"
              >
                copy
              </button>
            </div>
          </div>
        )}
      </div>

      <Button variant="outline" size="full" onClick={() => navigate("/invite-team")}>
        <span className="font-sans text-[16px]">add team member</span>
      </Button>
    </div>
  );
}
