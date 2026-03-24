import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { toast } from "sonner";

export default function JoinProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentProjectId } = useProjectContext();
  const initialCode = (searchParams.get("code") ?? "").trim().toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [found, setFound] = useState<{ id: string; name: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [noInvite, setNoInvite] = useState(false);

  const lookupProject = async (inputCode: string) => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;

    setLooking(true);
    setNotFound(false);
    setFound(null);
    setNoInvite(false);

    try {
      const { data, error } = await supabase.rpc("lookup_project_by_code", {
        _code: trimmed,
      });

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
        return;
      }

      const project = Array.isArray(data) ? data[0] : data;
      setCode(trimmed);
      setFound({ id: project.id, name: project.name });
    } catch (err) {
      console.error("lookup project by code failed:", err);
      setNotFound(true);
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    if (!initialCode) return;
    void lookupProject(initialCode);
  }, [initialCode]);

  const handleLookup = async () => {
    await lookupProject(code);
  };

  const handleJoin = async () => {
    if (!found) return;
    setJoining(true);
    setNoInvite(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if already an active member
      const { data: existingActive } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", found.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingActive) {
        setCurrentProjectId(found.id);
        toast.success(`already joined ${found.name}`);
        navigate("/project/dashboard");
        return;
      }

      // Look for an existing invite (status = 'invited', no user_id yet)
      // Match by user email against invite — we match by checking all invited members
      // and claiming one that hasn't been claimed yet
      const { data: invites } = await supabase
        .from("project_members")
        .select("id, name, role")
        .eq("project_id", found.id)
        .eq("status", "invited")
        .is("user_id", null);

      if (!invites || invites.length === 0) {
        setNoInvite(true);
        return;
      }

      // Claim the first available invite
      const invite = invites[0];
      const { error } = await supabase
        .from("project_members")
        .update({
          user_id: user.id,
          status: "active" as const,
          joined_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      if (error) throw error;

      setCurrentProjectId(found.id);
      toast.success(`joined ${found.name} as ${invite.role}`);
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Join project error:", err);
      const message = err instanceof Error ? err.message : "failed to join project";
      toast.error(`failed to join project: ${message}`);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <div className="mb-8">
        <button
          onClick={() => navigate("/")}
          className="font-mono text-[13px] text-muted-foreground"
        >
          ← back
        </button>
      </div>

      <div className="flex-1">
        {!found && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-2">join a project</h1>
            <p className="font-sans text-[14px] text-muted-foreground mb-8">
              enter the code from your project manager
            </p>
            <input
              type="text"
              placeholder="CMT-XXXXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setNotFound(false);
              }}
              className="underline-input font-mono tracking-widest text-[18px]"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            {notFound && (
              <p className="font-mono text-[12px] text-destructive mt-4">
                project code not found — check with your project manager
              </p>
            )}
          </>
        )}

        {found && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-1">{found.name}</h1>
            <p className="font-mono text-[12px] text-muted-foreground mb-8">
              {code.trim().toUpperCase()}
            </p>
            <p className="font-sans text-[14px] text-muted-foreground">
              tap join to claim your invitation. your project manager must have added you to the team first.
            </p>
            {noInvite && (
              <p className="font-mono text-[12px] text-destructive mt-4">
                no pending invitation found — ask your project manager to add you to the team first
              </p>
            )}
          </>
        )}
      </div>

      {!found && (
        <Button
          variant="dark"
          size="full"
          disabled={code.trim().length === 0 || looking}
          onClick={handleLookup}
        >
          <span className="font-sans text-[16px]">
            {looking ? "looking up..." : "find project"}
          </span>
        </Button>
      )}

      {found && (
        <Button
          variant="dark"
          size="full"
          disabled={joining}
          onClick={handleJoin}
        >
          <span className="font-sans text-[16px]">
            {joining ? "joining..." : "join project"}
          </span>
        </Button>
      )}
    </div>
  );
}
