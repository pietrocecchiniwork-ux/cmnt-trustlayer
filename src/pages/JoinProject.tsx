import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { toast } from "sonner";

type Role = "contractor" | "trade" | "client";

export default function JoinProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentProjectId } = useProjectContext();
  const initialCode = (searchParams.get("code") ?? "").trim().toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [found, setFound] = useState<{ id: string; name: string } | null>(null);

  const [memberName, setMemberName] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [joining, setJoining] = useState(false);

  const lookupProject = async (inputCode: string) => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;

    setLooking(true);
    setNotFound(false);
    setFound(null);

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
    if (!found || !memberName.trim() || !role) return;
    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: existingMembership, error: existingError } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", found.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingMembership) {
        setCurrentProjectId(found.id);
        toast.success(`already joined ${found.name}`);
        navigate("/project/dashboard");
        return;
      }

      const { error } = await supabase.from("project_members").insert({
        project_id: found.id,
        user_id: user.id,
        name: memberName.trim(),
        role: role as Role,
        status: "active" as const,
        joined_at: new Date().toISOString(),
      });
      if (error) throw error;
      setCurrentProjectId(found.id);
      toast.success(`joined ${found.name}`);
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Join project error:", err);
      const message = err instanceof Error ? err.message : "failed to join project";
      toast.error(`failed to join project: ${message}`);
    } finally {
      setJoining(false);
    }
  };

  const roles: { key: Role; label: string }[] = [
    { key: "contractor", label: "contractor" },
    { key: "trade", label: "trade" },
    { key: "client", label: "client" },
  ];

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
            <p className="font-mono text-[12px] text-muted-foreground mb-8">{code.trim().toUpperCase()}</p>

            <div className="space-y-6">
              <input
                type="text"
                placeholder="your name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="underline-input"
                autoFocus
              />

              <div className="space-y-2">
                <p className="font-mono text-[11px] text-muted-foreground tracking-widest uppercase">your role</p>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRole(r.key)}
                      className={`w-full text-left px-4 py-3 border transition-colors ${
                        role === r.key
                          ? "border-foreground bg-foreground/5"
                          : "border-border"
                      }`}
                    >
                      <span className="font-sans text-[15px] text-foreground">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
          <span className="font-sans text-[16px]">{looking ? "looking up..." : "find project"}</span>
        </Button>
      )}

      {found && (
        <Button
          variant="dark"
          size="full"
          disabled={!memberName.trim() || !role || joining}
          onClick={handleJoin}
        >
          <span className="font-sans text-[16px]">{joining ? "joining..." : "join project"}</span>
        </Button>
      )}
    </div>
  );
}
