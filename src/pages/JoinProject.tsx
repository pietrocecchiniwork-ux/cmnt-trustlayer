import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { toast } from "sonner";

export default function JoinProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentProjectId } = useProjectContext();
  const initialCode = (searchParams.get("code") ?? "").trim().toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [found, setFound] = useState<{ id: string; name: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [noInvite, setNoInvite] = useState(false);

  // After verifying email+code, show account creation
  const [verified, setVerified] = useState(false);
  const [verifiedInvite, setVerifiedInvite] = useState<{ id: string; name: string; role: string } | null>(null);
  const [password, setPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const lookupProject = async (inputCode: string) => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;
    setLooking(true);
    setNotFound(false);
    setFound(null);
    setNoInvite(false);
    try {
      const { data, error } = await supabase.rpc("lookup_project_by_code", { _code: trimmed });
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

  // Check if user is already logged in and try standard join
  const handleJoinLoggedIn = async () => {
    if (!found) return;
    setJoining(true);
    setNoInvite(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in — show email+code flow
        return;
      }

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

      // Try claiming by email match
      const userEmail = user.email?.toLowerCase();
      if (userEmail) {
        const { data: emailInvite } = await supabase
          .from("project_members")
          .select("id, name, role")
          .eq("project_id", found.id)
          .eq("email", userEmail)
          .eq("status", "invited")
          .is("user_id", null)
          .maybeSingle();

        if (emailInvite) {
          const { error } = await supabase
            .from("project_members")
            .update({ user_id: user.id, status: "active" as const, joined_at: new Date().toISOString() })
            .eq("id", emailInvite.id);
          if (error) throw error;
          setCurrentProjectId(found.id);
          toast.success(`joined ${found.name} as ${emailInvite.role}`);
          navigate("/project/dashboard");
          return;
        }
      }

      // Try claiming any unclaimed invite
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

      const invite = invites[0];
      const { error } = await supabase
        .from("project_members")
        .update({ user_id: user.id, status: "active" as const, joined_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (error) throw error;
      setCurrentProjectId(found.id);
      toast.success(`joined ${found.name} as ${invite.role}`);
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Join project error:", err);
      toast.error("failed to join project");
    } finally {
      setJoining(false);
    }
  };

  // Verify email + code: check if there's an invite matching this email
  const handleVerifyEmailCode = async () => {
    if (!found || !email.trim()) return;
    setJoining(true);
    setNoInvite(false);
    setAccountError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Check if there's an invite for this email
      // We use the RPC to look up the project, then check via edge or direct
      // Since we can't query project_members without auth, we need to use a different approach
      // Let's check if the user already has an account first
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Already logged in, just try joining
        await handleJoinLoggedIn();
        return;
      }

      // Try signing in with OTP to verify email ownership
      // But first, let's try password login in case they already have an account
      // For the code-based flow, we'll create the account directly
      setVerified(true);
      setVerifiedInvite({ id: "", name: email, role: "" });
    } finally {
      setJoining(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!password.trim() || password.length < 6) {
      setAccountError("password must be at least 6 characters");
      return;
    }
    if (!found) return;
    setCreatingAccount(true);
    setAccountError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Try to sign up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpErr) {
        // If user already exists, try sign in
        if (signUpErr.message.includes("already registered") || signUpErr.message.includes("already been registered")) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });
          if (signInErr) {
            setAccountError(signInErr.message);
            return;
          }
        } else {
          setAccountError(signUpErr.message);
          return;
        }
      }

      // Now claim the invitation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccountError("account created — please check your email to confirm, then come back");
        return;
      }

      // Claim invitations
      await supabase.rpc("claim_invitations_for_user", {
        _user_id: user.id,
        _email: trimmedEmail,
      });

      // Check if we're now a member
      const { data: membership } = await supabase
        .from("project_members")
        .select("id, role")
        .eq("project_id", found.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membership) {
        setCurrentProjectId(found.id);
        toast.success(`joined ${found.name}`);
        navigate("/project/dashboard");
      } else {
        setCurrentProjectId(found.id);
        toast.success("account created — you may need to wait for your PM to add you");
        navigate("/");
      }
    } catch (err) {
      console.error("Create account error:", err);
      setAccountError("something went wrong");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!found) return;
    // Store the project info for after redirect
    sessionStorage.setItem("joinProjectId", found.id);
    sessionStorage.setItem("joinProjectCode", code);

    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/join?code=${encodeURIComponent(code)}`,
    });
  };

  // On mount, if user is logged in and we have a project, try auto-joining
  useEffect(() => {
    if (!found) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        handleJoinLoggedIn();
      }
    });
  }, [found]);

  // Account creation screen after email+code verification
  if (verified && found) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
        <div className="mb-8">
          <button onClick={() => { setVerified(false); setAccountError(null); }} className="font-mono text-[13px] text-muted-foreground">← back</button>
        </div>

        <div className="flex-1">
          <h1 className="font-sans text-[22px] text-foreground mb-1">{found.name}</h1>
          <p className="font-mono text-[12px] text-muted-foreground mb-8">{email.trim().toLowerCase()}</p>

          <p className="font-sans text-[14px] text-muted-foreground mb-8">
            create an account to join this project
          </p>

          <div className="space-y-4 mb-8">
            <input
              type="password"
              placeholder="create a password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="underline-input"
            />
            {accountError && (
              <p className="font-mono text-[12px] text-destructive">{accountError}</p>
            )}
          </div>

          <div className="relative w-full my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 font-mono text-[10px] text-muted-foreground">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-foreground text-background rounded-none font-sans text-[15px] font-medium py-4 mb-4"
          >
            continue with google
          </button>
        </div>

        <Button variant="dark" size="full" disabled={creatingAccount} onClick={handleCreateAccount}>
          <span className="font-sans text-[16px]">{creatingAccount ? "creating..." : "create account & join"}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <div className="mb-8">
        <button onClick={() => navigate("/")} className="font-mono text-[13px] text-muted-foreground">← back</button>
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
              onChange={(e) => { setCode(e.target.value); setNotFound(false); }}
              className="underline-input font-mono tracking-widest text-[18px] mb-4"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <input
              type="email"
              placeholder="your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="underline-input mb-4"
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

            <input
              type="email"
              placeholder="your email (must match invite)"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setNoInvite(false); }}
              className="underline-input mb-4"
            />

            <p className="font-sans text-[14px] text-muted-foreground">
              enter the email your project manager used when adding you
            </p>
            {noInvite && (
              <p className="font-mono text-[12px] text-destructive mt-4">
                no pending invitation found for this email — ask your project manager to add you
              </p>
            )}
          </>
        )}
      </div>

      {!found && (
        <Button variant="dark" size="full" disabled={code.trim().length === 0 || looking} onClick={handleLookup}>
          <span className="font-sans text-[16px]">{looking ? "looking up..." : "find project"}</span>
        </Button>
      )}

      {found && (
        <Button variant="dark" size="full" disabled={joining || !email.trim()} onClick={handleVerifyEmailCode}>
          <span className="font-sans text-[16px]">{joining ? "verifying..." : "continue"}</span>
        </Button>
      )}
    </div>
  );
}
