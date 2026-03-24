import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useAddProjectMember, useProject } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "pm" | "contractor" | "trade" | "client";

interface TeamMember {
  name: string;
  email: string;
  phone: string;
  role: Role;
}

function buildInviteMessage(name: string, projectName: string, role: string, code: string): string {
  return `Hi ${name}, you've been added to ${projectName} on Cemento. Your role: ${role}. Join here: cmnt-trustlayer.lovable.app/join — use code ${code}`;
}

export default function InviteTeam() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { role: currentUserRole } = useRole();
  const addMember = useAddProjectMember();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(currentUserRole === "contractor" ? "trade" : "contractor");
  const [sending, setSending] = useState(false);
  const [savedMembers, setSavedMembers] = useState<TeamMember[]>([]);
  const [done, setDone] = useState(false);

  const availableRoles: Role[] =
    currentUserRole === "pm"
      ? ["pm", "contractor", "trade", "client"]
      : currentUserRole === "contractor"
      ? ["trade"]
      : [];

  const handleAdd = () => {
    if (!name.trim()) return;
    if (!email.trim() && !phone.trim()) {
      toast.error("Please provide email or phone number");
      return;
    }
    setMembers([...members, { name, email, phone, role }]);
    setName("");
    setEmail("");
    setPhone("");
  };

  const handleCopyInvite = async (m: TeamMember) => {
    const code = project?.project_code ?? "";
    const projectName = project?.name ?? "your project";
    const msg = buildInviteMessage(m.name, projectName, m.role, code);
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("invite message copied");
    } catch {
      toast.error("failed to copy");
    }
  };

  const handleSendInvites = async () => {
    if (!currentProjectId) {
      toast.error("No project selected");
      return;
    }
    setSending(true);
    try {
      let savedCount = 0;
      const inviteCode = project?.project_code;

      for (const m of members) {
        await addMember.mutateAsync({
          project_id: currentProjectId,
          name: m.name,
          phone_number: m.phone || null,
          email: m.email.trim().toLowerCase() || null,
          role: m.role,
          status: "invited" as const,
        });
        savedCount += 1;
      }

      if (savedCount === 0) {
        toast.error("No invites were saved");
      } else {
        toast.success(`${savedCount} member(s) added`);
        setSavedMembers(members);
        setMembers([]);
        setDone(true);
      }
    } catch (err) {
      console.error("Send invites failed:", err);
      const message = err instanceof Error ? err.message : "Failed to send invites";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  if (availableRoles.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">← back</button>
        <p className="font-sans text-[14px] text-muted-foreground">you don't have permission to add team members</p>
      </div>
    );
  }

  if (done && savedMembers.length > 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
        <h1 className="font-sans text-[22px] text-foreground mb-2">members added</h1>
        <p className="font-sans text-[14px] text-muted-foreground mb-8">
          copy and send each invite message manually
        </p>

        <div className="flex-1 space-y-4">
          {savedMembers.map((m, i) => (
            <div key={i} className="border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-[14px] text-foreground">{m.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {m.role} · {m.email || m.phone}
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                  {buildInviteMessage(m.name, project?.name ?? "your project", m.role, project?.project_code ?? "")}
                </p>
              </div>
              <button
                onClick={() => handleCopyInvite(m)}
                className="font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5"
              >
                copy invite message
              </button>
            </div>
          ))}
        </div>

        <Button variant="dark" size="full" onClick={() => navigate(-1)} className="mt-6">
          <span className="font-sans text-[16px]">done</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">← back</button>
      <h1 className="font-sans text-[22px] text-foreground mb-8">
        {currentUserRole === "contractor" ? "add trade" : "invite team"}
      </h1>

      <div className="space-y-4 mb-6">
        <input type="text" placeholder="name *" value={name} onChange={(e) => setName(e.target.value)} className="underline-input" />
        <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} className="underline-input" />
        <input type="tel" placeholder="phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="underline-input" />
        {availableRoles.length > 1 && (
          <div className="flex border-b border-border">
            {availableRoles.map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`flex-1 py-3 font-mono text-[12px] text-center transition-colors ${role === r ? "text-accent border-b-2 border-accent" : "text-muted-foreground"}`}>
                {r}
              </button>
            ))}
          </div>
        )}
        <Button variant="outline" size="default" onClick={handleAdd} className="w-full mt-2">
          <span className="font-sans text-[14px]">add member</span>
        </Button>
      </div>

      <div className="flex-1">
        {members.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <span className="font-sans text-[14px] text-foreground">{m.name}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[11px] text-muted-foreground">{m.role}</span>
              <p className="font-mono text-[10px] text-muted-foreground">{m.email || m.phone}</p>
            </div>
          </div>
        ))}
      </div>

      <Button variant="dark" size="full" onClick={handleSendInvites} disabled={members.length === 0 || sending}>
        <span className="font-sans text-[16px]">{sending ? "saving..." : "save & invite"}</span>
      </Button>
    </div>
  );
}
