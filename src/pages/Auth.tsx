import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentProjectId } = useProjectContext();
  const { t } = useTranslation();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const seedingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !seedingRef.current) navigate("/");
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setGoogleError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + '/project/dashboard',
    });
    if (result?.error) setGoogleError(result.error.message);
  };

  const handleDemo = async () => {
    seedingRef.current = true;
    setDemoLoading(true);
    try {
      const { error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) throw anonErr;

      const { data, error } = await supabase.functions.invoke("seed-demo-project");
      if (error) throw error;

      await queryClient.invalidateQueries();
      queryClient.clear();

      setCurrentProjectId(data.project_id);
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Demo seed error:", err);
      toast.error("Failed to load demo");
      seedingRef.current = false;
    } finally {
      setDemoLoading(false);
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

  if (demoLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-10 h-10 bg-foreground rounded-sm mb-4" />
        <p className="font-mono text-[12px] text-muted-foreground animate-pulse">{t("auth.setting_up_demo")}</p>
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
            {t("auth.continue_google")}
          </button>

          {googleError && (
            <p className="font-mono text-[11px] text-destructive mt-2 w-full">{googleError}</p>
          )}

          <div className="relative w-full my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 font-mono text-[10px] text-muted-foreground">{t("common.or")}</span>
            </div>
          </div>

          {!showEmail && (
            <>
              <button
                onClick={() => setShowEmail(true)}
                className="font-mono text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                {t("auth.continue_email")}
              </button>

              <button
                onClick={handleDemo}
                className="font-mono text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors mt-8"
              >
                {t("auth.explore_demo")}
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
              {loading ? t("auth.sending") : t("auth.send_magic_link")}
            </span>
          </Button>

          <button
            onClick={() => setShowEmail(false)}
            className="font-mono text-[13px] text-muted-foreground mt-6 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            {t("common.back")}
          </button>
        </div>
      )}

      {sent && (
        <div className="flex flex-col items-center">
          <p className="font-sans text-[22px] text-foreground mb-4 text-center">{t("auth.check_email")}</p>
          <p className="font-sans text-[14px] text-muted-foreground text-center">
            {t("auth.magic_link_sent", { email })}
          </p>
        </div>
      )}
    </div>
  );
}
