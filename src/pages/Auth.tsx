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

  const handleDemo = async () => {
    setDemoLoading(true);

    const { data: { user }, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !user) { setDemoLoading(false); return; }

    const { data: project } = await supabase.from("projects").insert({
      name: "14 Kensington Mews — Demo",
      address: "14 Kensington Mews, London W8",
      start_date: "2026-01-10",
      end_date: "2026-05-25",
      payment_mode: true,
      total_budget: 92000,
      created_by: user.id,
    }).select().single();

    if (!project) { setDemoLoading(false); return; }

    const milestonesPayload = [
      { name: "Site setup and demolition",         status: "complete"    as const, payment_value: 8000,  due_date: "2026-01-10", position: 1 },
      { name: "Foundations and groundwork",         status: "complete"    as const, payment_value: 15000, due_date: "2026-01-28", position: 2 },
      { name: "Structural frame and roof",          status: "complete"    as const, payment_value: 22000, due_date: "2026-02-20", position: 3 },
      { name: "First fix electrical and plumbing",  status: "overdue"     as const, payment_value: 11000, due_date: "2026-03-08", position: 4 },
      { name: "Plastering and drylining",           status: "in_progress" as const, payment_value: 9000,  due_date: "2026-03-22", position: 5 },
      { name: "Second fix and joinery",             status: "pending"     as const, payment_value: 14000, due_date: "2026-04-10", position: 6 },
      { name: "Decoration and finishing",           status: "pending"     as const, payment_value: 7000,  due_date: "2026-04-28", position: 7 },
      { name: "Final inspection and handover",      status: "pending"     as const, payment_value: 6000,  due_date: "2026-05-12", position: 8 },
    ].map(m => ({ ...m, project_id: project.id, created_from: "manual" as const }));

    const [{ data: milestones }] = await Promise.all([
      supabase.from("milestones").insert(milestonesPayload).select(),
      supabase.from("project_members").insert([
        { project_id: project.id, user_id: user.id, name: "You",      role: "pm"         as const, status: "active"     as const, joined_at: new Date().toISOString() },
        { project_id: project.id,                   name: "Mark T.",  role: "contractor" as const, status: "confirmed"  as const },
        { project_id: project.id,                   name: "Sarah K.", role: "trade"      as const, status: "confirmed"  as const },
        { project_id: project.id,                   name: "James R.", role: "client"     as const, status: "confirmed"  as const },
      ]),
    ]);

    if (!milestones) { setDemoLoading(false); return; }

    const sorted = [...milestones].sort((a, b) => a.position - b.position);
    const m4 = sorted[3];

    await Promise.all([
      supabase.from("evidence").insert([
        { milestone_id: m4.id, note: "First fix wiring complete in kitchen and living room", ai_tags: ["electrical", "first-fix", "wiring", "kitchen"],        channel: "app"      as const, submitted_by: user.id },
        { milestone_id: m4.id, note: "Consumer unit installed and labelled",                 ai_tags: ["electrical", "consumer-unit", "labelling"],             channel: "whatsapp" as const, submitted_by: user.id },
        { milestone_id: m4.id, note: "Hot and cold feeds roughed in for bathrooms",          ai_tags: ["plumbing", "first-fix", "bathroom", "pipework"],         channel: "app"      as const, submitted_by: user.id },
        { milestone_id: m4.id, note: "Soil stack connected and pressure tested",             ai_tags: ["plumbing", "soil-stack", "pressure-test", "drainage"],   channel: "app"      as const, submitted_by: user.id },
      ]),
      supabase.from("payment_certificates").insert([
        { milestone_id: sorted[0].id, amount: 8000,  released_at: new Date().toISOString(), released_by: user.id },
        { milestone_id: sorted[1].id, amount: 15000, released_at: new Date().toISOString(), released_by: user.id },
        { milestone_id: sorted[2].id, amount: 22000, released_at: new Date().toISOString(), released_by: user.id },
      ]),
    ]);

    navigate("/project/dashboard");
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
