import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useState, useEffect } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate("/");
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setGoogleError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + '/project/dashboard',
    });
    if (result?.error) setGoogleError(result.error.message);
  };


  const handleEmailOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (!error) setSent(true);
    else console.error("Email OTP error:", error);
  };

  if (demoLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <p className="font-mono text-[12px] text-muted-foreground">setting up demo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-24 pb-6 items-center">
      {/* Logo */}
      <div className="flex flex-col items-center mb-20">
        <div className="w-10 h-10 bg-foreground rounded-sm mb-4" />
        <p className="font-mono text-[18px] text-foreground tracking-tight">cemento</p>
      </div>

      {!sent && (
        <div className="w-full max-w-[300px] flex flex-col items-center">
          <button
            onClick={handleGoogle}
            className="w-full bg-foreground text-background rounded-none font-sans text-[15px] font-medium py-4"
          >
            continue with google
          </button>

          {googleError && (
            <p className="font-mono text-[11px] text-destructive mt-2 w-full">{googleError}</p>
          )}

          <div className="relative w-full my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 font-mono text-[10px] text-muted-foreground">or</span>
            </div>
          </div>

          {!showEmail && (
            <>
              <button
                onClick={() => setShowEmail(true)}
                className="font-mono text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                continue with email
              </button>
              <button
                onClick={handleDemo}
                className="font-mono text-[12px] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors mt-4"
              >
                explore demo
              </button>
            </>
          )}
        </div>
      )}

      {showEmail && !sent && (
        <div className="w-full max-w-[300px] flex flex-col items-center">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="underline-input text-center mb-8"
          />
          <Button
            variant="dark"
            size="full"
            onClick={handleEmailOtp}
            disabled={loading}
          >
            <span className="font-sans text-[16px]">
              {loading ? "sending..." : "send magic link"}
            </span>
          </Button>

          <button
            onClick={() => setShowEmail(false)}
            className="font-mono text-[13px] text-muted-foreground mt-6 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            ← back
          </button>
        </div>
      )}

      {sent && (
        <div className="flex flex-col items-center">
          <p className="font-sans text-[22px] text-foreground mb-4 text-center">check your email</p>
          <p className="font-sans text-[14px] text-muted-foreground text-center">
            we sent a magic link to {email}
          </p>
        </div>
      )}
    </div>
  );
}
