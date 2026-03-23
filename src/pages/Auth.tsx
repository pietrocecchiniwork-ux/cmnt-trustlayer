import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (!error) setSent(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-24 pb-6 items-center">
      <p className="font-mono text-[18px] text-foreground mb-16">cemento</p>

      {!sent ? (
        <>
          <h1 className="font-sans text-[22px] text-foreground mb-8 text-center">sign in with email</h1>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="underline-input text-center mb-8 max-w-[300px]"
          />
          <Button variant="dark" size="full" className="max-w-[300px]" onClick={handleLogin} disabled={loading}>
            <span className="font-sans text-[16px]">{loading ? "sending..." : "send magic link"}</span>
          </Button>

          <button
            onClick={() => navigate("/")}
            className="font-mono text-[12px] text-muted-foreground mt-8"
          >
            continue as demo →
          </button>
        </>
      ) : (
        <>
          <p className="font-sans text-[22px] text-foreground mb-4 text-center">check your email</p>
          <p className="font-sans text-[14px] text-muted-foreground text-center">
            we sent a magic link to {email}
          </p>
        </>
      )}
    </div>
  );
}
