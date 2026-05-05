import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSupabaseProject";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export default function PaymentCertificate() {
  const navigate = useNavigate();
  const { milestoneId } = useParams<{ milestoneId: string }>();
  const { data: currentUser } = useCurrentUser();
  const [saving, setSaving] = useState(false);

  const { data: milestone, isLoading: milestoneLoading } = useQuery({
    queryKey: ["milestone", milestoneId],
    enabled: !!milestoneId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("id, name, payment_value, project_id, approved_by, approved_at")
        .eq("id", milestoneId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", milestone?.project_id],
    enabled: !!milestone?.project_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", milestone!.project_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: approverMember, isLoading: approverLoading } = useQuery({
    queryKey: ["approver-member", milestone?.approved_by, milestone?.project_id],
    enabled: !!milestone?.approved_by && !!milestone?.project_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("name")
        .eq("user_id", milestone!.approved_by!)
        .eq("project_id", milestone!.project_id)
        .maybeSingle();
      if (error) console.warn("Approver lookup error:", error);
      return data ?? null;
    },
  });

  const isLoading = milestoneLoading || projectLoading || approverLoading;

  const certRef = milestone
    ? (() => {
        const date = milestone.approved_at ? parseISO(milestone.approved_at) : new Date();
        const xxx = milestone.id.replace(/-/g, "").slice(0, 3).toUpperCase();
        return `CMT-${format(date, "yyyy")}-${format(date, "MMdd")}-${xxx}`;
      })()
    : "";

  const approvedDate = milestone?.approved_at
    ? format(parseISO(milestone.approved_at), "dd MMM yyyy")
    : "—";

  const handleRelease = async () => {
    if (!milestoneId || !currentUser) {
      toast.error("Missing milestone or not signed in");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("payment_certificates").insert({
        milestone_id: milestoneId,
        amount: Number(milestone?.payment_value ?? 0),
        generated_at: now,
        payment_status: "awaiting_client_authorization",
      } as any);
      if (error) throw error;
      toast.success("Payment certificate created — awaiting client authorization");
      navigate("/project/payments");
    } catch (err) {
      console.error("Release payment failed:", err);
      toast.error("Failed to release payment");
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
      </div>
    );
  }

  if (!milestone) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen px-6 pt-20 pb-6 space-y-3">
        <button onClick={() => navigate(-1)} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left">
          ← back
        </button>

        {/* Certificate card */}
        <div className="bg-card rounded-3xl px-6 py-6">
          <p className="t-eyebrow">payment certificate</p>
          <p className="font-sans text-[44px] tracking-[-0.02em] text-foreground mt-2 leading-none">
            £{Number(milestone.payment_value ?? 0).toLocaleString()}
          </p>
          <p className="font-sans text-[15px] text-muted-foreground mt-2 lowercase">{milestone.name}</p>

          <div className="h-px bg-border/60 my-5" />

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="t-eyebrow">project</span>
              <span className="font-sans text-[13px] text-foreground">{project?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="t-eyebrow">approved by</span>
              <span className="font-sans text-[13px] text-foreground">{approverMember?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="t-eyebrow">date</span>
              <span className="font-sans text-[13px] text-foreground">{approvedDate}</span>
            </div>
          </div>

          <div className="h-px bg-border/60 my-5" />

          <p className="font-mono text-[10px] text-muted-foreground tracking-wider">{certRef}</p>
        </div>

        <div className="bg-card rounded-3xl px-6 py-5">
          <p className="font-sans text-[13px] text-muted-foreground">
            the team will be notified via whatsapp
          </p>
        </div>

        <div className="flex-1" />

        <Button variant="dark" size="full" onClick={handleRelease} disabled={saving}>
          <span className="font-sans text-[16px]">
            {saving ? "generating..." : "generate payment certificate"}
          </span>
        </Button>
      </div>
    </div>
  );
}
