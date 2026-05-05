import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useState, useEffect } from "react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DemoWalkthrough } from "@/components/DemoWalkthrough";

export default function Auth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentProjectId } = useProjectContext();
  const { t } = useTranslation();
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate("/");
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setGoogleError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/project/dashboard",
    });
    if (result?.error) setGoogleError(result.error.message);
  };

  const handleDemo = () => setShowDemo(true);

  const handlePasswordAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    setPasswordLoading(true);
    setPasswordError(null);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setPasswordLoading(false);
      if (error) setPasswordError(error.message);
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPasswordLoading(false);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setPasswordError("Invalid email or password.");
        } else if (error.message.includes("Email not confirmed")) {
          setPasswordError("Please confirm your email before signing in.");
        } else {
          setPasswordError(error.message);
        }
      } else navigate("/");
    }
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

  if (showDemo) return <DemoWalkthrough onClose={() => setShowDemo(false)} />;

  const ErrorLine = ({ msg }: { msg: string }) => (
    <div className="flex items-start gap-2 mt-2 w-full">
      <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" aria-hidden />
      <p className="t-label text-destructive">{msg}</p>
    </div>
  );

  const FieldLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="t-eyebrow self-start mb-1">
      {children}
    </label>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-20 pb-6 items-center">
      {/* Logo */}
      <div className="flex flex-col items-center mb-14">
        <div className="w-10 h-10 border border-foreground flex items-center justify-center mb-4">
          <span className="font-mono text-[14px] text-foreground">C</span>
        </div>
        <p className="font-mono text-[15px] text-foreground tracking-[-0.02em] lowercase">cemento</p>
      </div>

      {!sent && (
        <div className="w-full max-w-[300px] flex flex-col items-center">
          <button
            onClick={handleGoogle}
            className="w-full h-12 bg-foreground text-background font-sans text-[15px] font-medium border border-foreground hover:bg-foreground/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("auth.continue_google")}
          </button>

          {googleError && <ErrorLine msg={googleError} />}

          {/* divider */}
          <div className="flex items-center justify-center w-full my-6 gap-3">
            <span className="block w-6 h-px hairline-bg" />
            <span className="t-eyebrow">{t("common.or")}</span>
            <span className="block w-6 h-px hairline-bg" />
          </div>

          {!showEmail && !showPassword && (
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={() => setShowEmail(true)}
                className="t-label hover:text-foreground hover:underline underline-offset-4 transition-colors"
              >
                {t("auth.continue_email")}
              </button>
              <button
                onClick={() => setShowPassword(true)}
                className="t-label hover:text-foreground hover:underline underline-offset-4 transition-colors"
              >
                sign in with password
              </button>
              <button
                onClick={handleDemo}
                className="t-label mt-5 hover:text-foreground hover:underline underline-offset-4 transition-colors"
              >
                {t("auth.explore_demo")}
              </button>
            </div>
          )}
        </div>
      )}

      {showEmail && !sent && (
        <div className="w-full max-w-[300px] flex flex-col items-stretch">
          <FieldLabel htmlFor="email-otp">email</FieldLabel>
          <input
            id="email-otp"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="underline-input mb-8"
          />
          <Button variant="dark" size="full" onClick={handleEmailOtp} disabled={loading}>
            <span className="font-sans text-[15px]">
              {loading ? t("auth.sending") : t("auth.send_magic_link")}
            </span>
          </Button>
          <button
            onClick={() => setShowEmail(false)}
            className="t-label mt-6 self-center hover:text-foreground hover:underline underline-offset-4 transition-colors"
          >
            {t("common.back")}
          </button>
        </div>
      )}

      {showPassword && !sent && (
        <div className="w-full max-w-[300px] flex flex-col items-stretch">
          <FieldLabel htmlFor="email-pw">email</FieldLabel>
          <input
            id="email-pw"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="underline-input mb-4"
          />
          <FieldLabel htmlFor="pw">password</FieldLabel>
          <input
            id="pw"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="underline-input mb-6"
          />
          {passwordError && <ErrorLine msg={passwordError} />}
          <Button variant="dark" size="full" onClick={handlePasswordAuth} disabled={passwordLoading}>
            <span className="font-sans text-[15px]">
              {passwordLoading ? "…" : isSignUp ? "create account" : "sign in"}
            </span>
          </Button>

          <div className="flex flex-col items-center gap-2 mt-5">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="t-label hover:text-foreground hover:underline underline-offset-4 transition-colors"
            >
              {isSignUp ? "already have an account?" : "create account"}
            </button>
            {!isSignUp && (
              <button
                onClick={() => navigate("/forgot-password")}
                className="t-label hover:text-foreground hover:underline underline-offset-4 transition-colors"
              >
                forgot password?
              </button>
            )}
            <button
              onClick={() => { setShowPassword(false); setPasswordError(null); }}
              className="t-label mt-3 hover:text-foreground hover:underline underline-offset-4 transition-colors"
            >
              {t("common.back")}
            </button>
          </div>
        </div>
      )}

      {sent && (
        <div className="flex flex-col items-center max-w-[300px]">
          <p className="t-display text-foreground mb-3 text-center">{t("auth.check_email")}</p>
          <p className="t-body text-muted-foreground text-center">
            {t("auth.magic_link_sent", { email })}
          </p>
        </div>
      )}

      <div className="mt-auto pt-10">
        <p className="t-eyebrow">cemento · trust infrastructure</p>
      </div>
    </div>
  );
}
