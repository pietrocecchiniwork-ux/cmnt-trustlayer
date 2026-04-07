import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
    // Listen for the PASSWORD_RECOVERY event from the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check if we already have a session (e.g. user clicked link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async () => {
    if (!password.trim()) return;
    if (password !== confirm) {
      setError("passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      toast.success("Password updated successfully");
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-24 pb-6 items-center">
      <div className="flex flex-col items-center mb-20">
        <div className="w-10 h-10 bg-foreground rounded-sm mb-4" />
        <p className="font-mono text-[18px] text-foreground tracking-tight">cemento</p>
      </div>

      {!ready ? (
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">verifying link...</p>
      ) : (
        <div className="w-full max-w-[300px] flex flex-col items-center">
          <p className="font-sans text-[16px] text-foreground mb-6 text-center">
            set your new password
          </p>
          <input
            type="password"
            placeholder="new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="underline-input text-center mb-4"
          />
          <input
            type="password"
            placeholder="confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="underline-input text-center mb-8"
          />
          {error && (
            <p className="font-mono text-[11px] text-destructive mb-4 w-full">{error}</p>
          )}
          <Button variant="dark" size="full" onClick={handleUpdate} disabled={loading}>
            <span className="font-sans text-[16px]">
              {loading ? "updating..." : "update password"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
