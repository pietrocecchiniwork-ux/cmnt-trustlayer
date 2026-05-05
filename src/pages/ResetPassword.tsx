import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async () => {
    if (!password.trim()) return;
    if (password !== confirm) { setError("passwords don't match"); return; }
    if (password.length < 6) { setError("password must be at least 6 characters"); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) setError(err.message);
    else { toast.success("Password updated"); navigate("/"); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-16 pb-10">
      <div className="flex flex-col items-center mb-10">
        <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mb-4">
          <span className="font-mono text-[18px] text-background">C</span>
        </div>
        <p className="font-sans text-[20px] text-foreground tracking-[-0.02em] lowercase">cemento</p>
      </div>

      <div className="w-full max-w-[380px] mx-auto bg-card rounded-3xl px-6 pt-7 pb-6 flex flex-col">
        {!ready ? (
          <p className="t-label text-center py-6 animate-pulse">verifying link…</p>
        ) : (
          <>
            <h1 className="font-sans text-[22px] text-foreground tracking-[-0.01em] mb-1">New password</h1>
            <p className="t-label mb-6">Set a strong password you'll remember.</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="t-eyebrow">new password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 px-4 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="t-eyebrow">confirm</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 px-4 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="w-full h-12 bg-foreground text-background rounded-full font-sans text-[14px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-destructive/10 t-label text-destructive">{error}</div>
            )}
          </>
        )}
      </div>

      <p className="t-eyebrow text-center mt-auto pt-10">cemento © 2026</p>
    </div>
  );
}
