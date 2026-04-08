import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * /demo route — seeds a real demo project and redirects to dashboard.
 * If unauthenticated, signs in anonymously first.
 */
export default function Demo() {
  const navigate = useNavigate();
  const { setCurrentProjectId } = useProjectContext();
  const queryClient = useQueryClient();
  const seedingRef = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (seedingRef.current) return;
    seedingRef.current = true;

    (async () => {
      try {
        // Ensure we have a session (anonymous if needed)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) throw anonErr;
        }

        const { data, error: seedErr } = await supabase.functions.invoke("seed-demo-project");
        if (seedErr) throw seedErr;

        await queryClient.invalidateQueries();
        queryClient.clear();
        setCurrentProjectId(data.project_id);
        navigate("/project/dashboard", { replace: true });
      } catch (err) {
        console.error("Demo seed error:", err);
        setError(true);
        toast.error("Failed to load demo");
      }
    })();
  }, [navigate, setCurrentProjectId, queryClient]);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
        <p className="font-mono text-[13px] text-destructive mb-4">failed to load demo</p>
        <button
          onClick={() => navigate("/auth")}
          className="font-mono text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center">
      <div className="w-10 h-10 bg-foreground rounded-sm mb-4" />
      <p className="font-mono text-[12px] text-muted-foreground animate-pulse">setting up demo project...</p>
    </div>
  );
}
