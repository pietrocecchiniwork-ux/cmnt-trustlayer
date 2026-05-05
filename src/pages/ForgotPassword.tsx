import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-background flex flex-col px-5 pt-16 pb-10">
      <div className="flex flex-col items-center mb-10">
        <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mb-4">
          <span className="font-mono text-[18px] text-background">C</span>
        </div>
        <p className="font-sans text-[20px] text-foreground tracking-[-0.02em] lowercase">cemento</p>
      </div>

      <div className="w-full max-w-[380px] mx-auto bg-card rounded-3xl px-6 pt-7 pb-6 flex flex-col">
        {!sent ? (
          <>
            <h1 className="font-sans text-[22px] text-foreground tracking-[-0.01em] mb-1">Reset password</h1>
            <p className="t-label mb-6">We'll email you a reset link.</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reset-email" className="t-eyebrow">email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-11 px-4 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full h-12 bg-foreground text-background rounded-full font-sans text-[14px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-destructive/10 t-label text-destructive">{error}</div>
            )}

            <button
              onClick={() => navigate("/auth")}
              className="t-label mt-6 self-center hover:text-foreground transition-colors"
            >
              ← back to sign in
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="t-title mb-2">Check your email</p>
            <p className="t-body text-muted-foreground">
              We sent a reset link to <strong className="text-foreground">{email}</strong>
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="t-label mt-8 hover:text-foreground transition-colors"
            >
              ← back to sign in
            </button>
          </div>
        )}
      </div>

      <p className="t-eyebrow text-center mt-auto pt-10">cemento © 2026</p>
    </div>
  );
}
