import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DemoWalkthrough } from "@/components/DemoWalkthrough";

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"choose" | "email" | "password">("choose");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate("/");
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/project/dashboard",
    });
    if (result?.error) setError(result.error.message);
  };

  const handlePasswordAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error } = await fn({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else if (isSignUp) setSent(true);
    else navigate("/");
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
    else setError(error.message);
  };

  if (showDemo) return <DemoWalkthrough onClose={() => setShowDemo(false)} />;

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-16 pb-10">
      {/* Brand */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mb-4">
          <span className="font-mono text-[18px] text-background">C</span>
        </div>
        <p className="font-sans text-[20px] text-foreground tracking-[-0.02em] lowercase">cemento</p>
        <p className="t-label mt-1">trust infrastructure for construction</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] mx-auto bg-card rounded-3xl px-6 pt-7 pb-6 flex flex-col">
        {sent ? (
          <div className="text-center py-6">
            <p className="t-title mb-2">{t("auth.check_email")}</p>
            <p className="t-body text-muted-foreground">
              {t("auth.magic_link_sent", { email })}
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-sans text-[22px] text-foreground tracking-[-0.01em] mb-1">
              {mode === "choose" ? "Welcome back" : mode === "email" ? "Magic link" : isSignUp ? "Create account" : "Sign in"}
            </h1>
            <p className="t-label mb-6">
              {mode === "choose" ? "Sign in to continue to your projects." : "Enter your details below."}
            </p>

            {mode === "choose" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGoogle}
                  className="w-full h-12 bg-foreground text-background rounded-full font-sans text-[14px] font-medium hover:bg-foreground/90 transition-colors"
                >
                  Continue with Google
                </button>
                <button
                  onClick={() => setMode("password")}
                  className="w-full h-12 bg-secondary text-foreground rounded-full font-sans text-[14px] font-medium hover:bg-secondary/80 transition-colors"
                >
                  Continue with email
                </button>
                <button
                  onClick={() => setShowDemo(true)}
                  className="w-full h-10 text-muted-foreground rounded-full font-mono text-[12px] hover:text-foreground transition-colors"
                >
                  Explore the demo →
                </button>
              </div>
            )}

            {mode === "email" && (
              <div className="flex flex-col gap-4">
                <Field id="email" label="email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />
                <PrimaryBtn loading={loading} onClick={handleEmailOtp}>
                  {loading ? "Sending…" : "Send magic link"}
                </PrimaryBtn>
              </div>
            )}

            {mode === "password" && (
              <div className="flex flex-col gap-4">
                <Field id="email-pw" label="email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />
                <Field id="pw" label="password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                <PrimaryBtn loading={loading} onClick={handlePasswordAuth}>
                  {loading ? "…" : isSignUp ? "Create account" : "Sign in"}
                </PrimaryBtn>
                <div className="flex justify-between t-label">
                  <button onClick={() => setIsSignUp(!isSignUp)} className="hover:text-foreground transition-colors">
                    {isSignUp ? "have an account?" : "create account"}
                  </button>
                  {!isSignUp && (
                    <button onClick={() => navigate("/forgot-password")} className="hover:text-foreground transition-colors">
                      forgot password?
                    </button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-destructive/10 t-label text-destructive">
                {error}
              </div>
            )}

            {mode !== "choose" && (
              <button
                onClick={() => { setMode("choose"); setError(null); }}
                className="t-label mt-6 self-center hover:text-foreground transition-colors"
              >
                ← back
              </button>
            )}
          </>
        )}
      </div>

      <p className="t-eyebrow text-center mt-auto pt-10">cemento © 2026</p>
    </div>
  );
}

function Field({ id, label, type, value, onChange, placeholder }: {
  id: string; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="t-eyebrow">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 px-4 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
      />
    </div>
  );
}

function PrimaryBtn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full h-12 bg-foreground text-background rounded-full font-sans text-[14px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
