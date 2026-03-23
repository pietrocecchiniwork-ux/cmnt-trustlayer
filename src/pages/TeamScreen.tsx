import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDemoProject } from "@/contexts/DemoProjectContext";

export default function TeamScreen() {
  const navigate = useNavigate();
  const { currentProject } = useDemoProject();

  const teamMembers = [
    { name: "anna p.", role: "pm", status: "active" },
    { name: "mark t.", role: "contractor", status: "active" },
    { name: "sarah k.", role: "trade", status: "active" },
    { name: "james r.", role: "client", status: "active" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-6">team</h1>

      <div className="flex-1">
        {teamMembers.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <p className="font-sans text-[14px] text-foreground">{m.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{m.role}</p>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
          </div>
        ))}

        <button
          onClick={() => navigate("/whatsapp-sim")}
          className="w-full py-4 border-b border-border text-left"
        >
          <span className="font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5">whatsapp bot</span>
        </button>
      </div>

      <Button variant="outline" size="full" onClick={() => navigate("/invite-team")}>
        <span className="font-sans text-[16px]">add team member</span>
      </Button>
    </div>
  );
}
