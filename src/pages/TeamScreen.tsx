import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import {
  useProjectMembers,
  useProject,
  useUpdateProjectMember,
  useDeleteProjectMember,
} from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

type Role = "pm" | "contractor" | "trade" | "client";
const allRoles: Role[] = ["pm", "contractor", "trade", "client"];

export default function TeamScreen() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: members = [], isLoading } = useProjectMembers(currentProjectId ?? undefined);
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { role } = useRole();
  const updateMember = useUpdateProjectMember();
  const deleteMember = useDeleteProjectMember();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("contractor");
  const [editPhone, setEditPhone] = useState("");

  const canManageTeam = role === "pm";
  const canAddTrade = role === "contractor";

  const startEdit = (m: typeof members[0]) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditRole(m.role as Role);
    setEditPhone(m.phone_number ?? "");
  };

  const saveEdit = async () => {
    if (!editingId || !currentProjectId) return;
    try {
      await updateMember.mutateAsync({
        id: editingId,
        project_id: currentProjectId,
        name: editName.trim(),
        role: editRole,
        phone_number: editPhone.trim() || null,
      });
      toast.success("member updated");
      setEditingId(null);
    } catch {
      toast.error("failed to update member");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!currentProjectId) return;
    if (!confirm("Remove this team member?")) return;
    try {
      await deleteMember.mutateAsync({ id: memberId, project_id: currentProjectId });
      toast.success("member removed");
    } catch {
      toast.error("failed to remove member");
    }
  };

  const handleCopyCode = async () => {
    const code = project?.project_code;
    if (!code) {
      toast.error("project code unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("code copied");
    } catch {
      toast.error("failed to copy");
    }
  };

  const handleCopyInvite = async (m: typeof members[0]) => {
    const code = project?.project_code ?? "";
    const projectName = project?.name ?? "your project";
    const msg = `Hi ${m.name}, you've been added to ${projectName} on Cemento. Your role: ${m.role}. Join here: cmnt-trustlayer.lovable.app/join — use code ${code}`;
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("invite message copied");
    } catch {
      toast.error("failed to copy");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-32">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-6">← back</button>
      <h1 className="font-sans text-[22px] text-foreground mb-6">team</h1>

      <div className="flex-1">
        {isLoading && (
          <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
        )}

        {members.map((m) => (
          <div key={m.id} className="py-4 border-b border-border">
            {editingId === m.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="underline-input"
                  placeholder="name"
                />
                <div className="flex border-b border-border">
                  {allRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => setEditRole(r)}
                      className={`flex-1 py-2 font-mono text-[11px] text-center transition-colors ${
                        editRole === r
                          ? "text-accent border-b-2 border-accent"
                          : "text-muted-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="underline-input"
                  placeholder="phone"
                />
                <div className="flex gap-3">
                  <button
                    onClick={saveEdit}
                    className="font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5"
                  >
                    save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="font-mono text-[12px] text-muted-foreground"
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-[14px] text-foreground">{m.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {m.role}
                    {m.phone_number && ` · ${m.phone_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      m.status === "active" ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                  {canManageTeam && (
                    <>
                      <button
                        onClick={() => handleCopyInvite(m)}
                        className="font-mono text-[11px] text-accent"
                      >
                        invite
                      </button>
                      <button
                        onClick={() => startEdit(m)}
                        className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="font-mono text-[11px] text-destructive"
                      >
                        remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && !isLoading && (
          <p className="font-sans text-[14px] text-muted-foreground mt-4">no team members yet</p>
        )}

        <button
          onClick={() => navigate("/whatsapp-sim")}
          className="w-full py-4 border-b border-border text-left"
        >
          <span className="font-mono text-[12px] text-accent border-b border-accent/40 pb-0.5">
            whatsapp bot
          </span>
        </button>

        {(canManageTeam || canAddTrade) && currentProjectId && (
          <div className="mt-10">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">
              project code
            </p>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[14px] text-foreground break-all">
                {project?.project_code ?? "not generated yet"}
              </p>
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

      {(canManageTeam || canAddTrade) && (
        <Button variant="outline" size="full" onClick={() => navigate("/invite-team")}>
          <span className="font-sans text-[16px]">
            {canAddTrade && !canManageTeam ? "add trade member" : "add team member"}
          </span>
        </Button>
      )}
    </div>
  );
}
