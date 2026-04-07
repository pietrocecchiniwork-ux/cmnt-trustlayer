import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-24 pb-6 items-center">
      <div className="flex flex-col items-center mb-20">
        <div className="w-10 h-10 bg-foreground rounded-sm mb-4" />
        <p className="font-mono text-[18px] text-foreground tracking-tight">cemento</p>
      </div>

      {!sent ? (
        <div className="w-full max-w-[300px] flex flex-col items-center">
          <p className="font-sans text-[16px] text-foreground mb-6 text-center">
            enter your email to receive a password reset link
          </p>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="underline-input text-center mb-8"
          />
          {error && (
            <p className="font-mono text-[11px] text-destructive mb-4 w-full">{error}</p>
          )}
          <Button variant="dark" size="full" onClick={handleReset} disabled={loading}>
            <span className="font-sans text-[16px]">
              {loading ? "sending..." : "send reset link"}
            </span>
          </Button>
          <button
            onClick={() => navigate("/auth")}
            className="font-mono text-[13px] text-muted-foreground mt-6 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            back to sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="font-sans text-[22px] text-foreground mb-4 text-center">check your email</p>
          <p className="font-sans text-[14px] text-muted-foreground text-center">
            we sent a reset link to <strong>{email}</strong>
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="font-mono text-[13px] text-muted-foreground mt-8 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            back to sign in
          </button>
        </div>
      )}
    </div>
  );
}
