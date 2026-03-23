import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useState, useEffect } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate("/");
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (error) console.error("Google login error:", error);
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

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-24 pb-6 items-center">
      {/* Logo */}
      <div className="flex flex-col items-center mb-20">
        <div className="w-10 h-10 bg-foreground rounded-sm mb-4" />
        <p className="font-mono text-[18px] text-foreground tracking-tight">cemento</p>
      </div>

      {!showEmail && !sent && (
        <div className="w-full max-w-[300px] flex flex-col items-center">
          <Button
            variant="dark"
            size="full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <span className="font-sans text-[16px]">
              {loading ? "connecting..." : "continue with google"}
            </span>
          </Button>

          <button
            onClick={() => setShowEmail(true)}
            className="font-mono text-[13px] text-muted-foreground mt-6 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            continue with email
          </button>
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
