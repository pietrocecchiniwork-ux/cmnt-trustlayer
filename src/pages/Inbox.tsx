import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import {
  useMilestones,
  useCurrentUser,
  useUpdateMilestoneStatus,
  useCreateChange,
  useProjectMembers,
} from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import type { Tables } from "@/integrations/supabase/types";

type Milestone = Tables<"milestones">;
type Evidence = Tables<"evidence">;

interface InboxItem {
  milestone: Milestone;
  evidence: Evidence[];
  latest: Evidence;
  submitterName: string;
  verdict: "pass" | "concern" | "fail" | null;
  verdictText: string;
}

export default function Inbox() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentProjectId } = useProjectContext();
  const queryClient = useQueryClient();

  const { data: currentUser } = useCurrentUser();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { data: members = [] } = useProjectMembers(currentProjectId ?? undefined);
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);

  const updateStatus = useUpdateMilestoneStatus();
  const createChange = useCreateChange();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    enabled: !!currentProjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("*").eq("id", currentProjectId!).single();
      if (error) throw error;
      return data;
    },
  });

  const inReview = milestones.filter(m => m.status === "in_review");
  const inReviewIds = inReview.map(m => m.id);

  const { data: evidenceByMilestone = {}, isLoading: evidenceLoading } = useQuery<Record<string, Evidence[]>>({
    queryKey: ["inbox-evidence", inReviewIds],
    enabled: inReviewIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence")
        .select("*")
        .in("milestone_id", inReviewIds)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      const grouped: Record<string, Evidence[]> = {};
      for (const e of (data ?? []) as Evidence[]) {
        (grouped[e.milestone_id] ||= []).push(e);
      }
      return grouped;
    },
  });

  const memberName = (uid: string | null | undefined) => {
    if (!uid) return "team member";
    return members.find(m => m.user_id === uid)?.name ?? "team member";
  };

  const items: InboxItem[] = inReview
    .map(m => {
      const ev = evidenceByMilestone[m.id] ?? [];
      if (ev.length === 0) return null;
      const latest = ev[0];
      const tags = (latest.ai_tags && typeof latest.ai_tags === "object")
        ? latest.ai_tags as Record<string, unknown> : {};
      const flag = typeof tags.condition_flag === "string" ? tags.condition_flag : null;
      const verdict = (flag === "pass" || flag === "concern" || flag === "fail") ? flag : null;
      const comment = typeof tags.ai_comment === "string" ? tags.ai_comment : null;
      const verdictText = comment ?? (verdict ?? "reviewed");
      return {
        milestone: m,
        evidence: ev,
        latest,
        submitterName: memberName(latest.submitted_by),
        verdict,
        verdictText,
      } as InboxItem;
    })
    .filter((x): x is InboxItem => x !== null);

  // Verified this week
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const verifiedThisWeek = milestones.filter(m => {
    if (m.status !== "complete") return false;
    const approvedAt = (m as any).approved_at;
    return approvedAt && new Date(approvedAt).getTime() >= weekAgo;
  });

  const handleApprove = async (item: InboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (approvingId) return;
    setApprovingId(item.milestone.id);
    const m = item.milestone;
    const assessment = "satisfactory";
    try {
      await updateStatus.mutateAsync({ id: m.id, status: "complete", projectId: currentProjectId! });
      try {
        await createChange.mutateAsync({
          project_id: currentProjectId!,
          entity_type: "milestone",
          entity_id: m.id,
          entity_name: m.name,
          change_type: "approved",
          changed_by: currentUser?.id,
          changed_by_name: currentUser?.email ?? undefined,
          new_value: { quality_assessment: assessment, from: "inbox" },
        });
      } catch (err) { console.warn("change log failed", err); }

      try {
        await supabase.from("evidence").update({
          quality_assessment: assessment,
          verification_level: 3,
          label_dimensions_captured: 2,
        } as any).eq("milestone_id", m.id);
      } catch (err) { console.warn("evidence update failed", err); }

      try {
        const recipients: { email: string; name?: string }[] = [];
        const assignedUserId = (m as any).assigned_to;
        if (assignedUserId) {
          const mem = members.find(x => x.user_id === assignedUserId);
          if (mem?.email) recipients.push({ email: mem.email, name: mem.name });
        }
        for (const c of members.filter(x => x.role === "client" && x.email)) {
          recipients.push({ email: c.email!, name: c.name });
        }
        for (const r of recipients) {
          await sendTransactionalEmail({
            templateName: "milestone-approved",
            recipientEmail: r.email,
            idempotencyKey: `milestone-approved-${m.id}-${r.email}`,
            templateData: {
              recipientName: r.name?.split(" ")[0] ?? null,
              milestoneName: m.name,
              projectName: project?.name ?? null,
              approverName: currentUser?.email?.split("@")[0] ?? null,
              paymentValue: m.payment_value ?? null,
            },
          });
        }
      } catch (err) { console.warn("email failed", err); }

      toast.success(`Approved ${m.name?.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["inbox-evidence"] });
    } catch (err) {
      toast.error("Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  if (!currentProjectId || isLoading || (inReviewIds.length > 0 && evidenceLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-20 pb-4">
          <p className="t-eyebrow">inbox</p>
          <p className="font-sans text-[26px] tracking-[-0.02em] text-foreground mt-1 lowercase truncate">
            {project?.name ?? "project"}
          </p>
        </div>

        <div className="px-6 pb-24 flex-1 space-y-6">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="font-sans text-[15px] text-muted-foreground text-center">
                All clear. No evidence waiting for review.
              </p>
            </div>
          ) : (
            <section className="space-y-3">
              <p className="t-eyebrow">needs your review</p>
              {items.map(item => (
                <ReviewCard
                  key={item.milestone.id}
                  item={item}
                  onOpen={() => navigate(`/project/milestone/${item.milestone.id}`)}
                  onApprove={(e) => handleApprove(item, e)}
                  approving={approvingId === item.milestone.id}
                />
              ))}
            </section>
          )}

          {verifiedThisWeek.length > 0 && (
            <section className="space-y-2">
              <p className="t-eyebrow">verified this week</p>
              <div className="bg-card rounded-3xl px-5 py-2">
                {verifiedThisWeek.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between py-3 ${
                      i !== verifiedThisWeek.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#39FF14" }} />
                      <span className="font-sans text-[14px] font-medium text-foreground truncate lowercase">
                        {m.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono text-[13px] text-gray-500">
                        £{Number(m.payment_value ?? 0).toLocaleString()}
                      </span>
                      <span className="font-mono text-[12px]" style={{ color: "#0a0a0a" }}>✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  item, onOpen, onApprove, approving,
}: {
  item: InboxItem;
  onOpen: () => void;
  onApprove: (e: React.MouseEvent) => void;
  approving: boolean;
}) {
  const { milestone, evidence, latest, submitterName, verdict, verdictText } = item;
  const photos = evidence.filter(e => !!e.photo_url).slice(0, 3);
  const extra = evidence.length - photos.length;
  const amount = Number(milestone.payment_value ?? 0);

  const verdictStyle: React.CSSProperties =
    verdict === "pass" ? { backgroundColor: "#39FF14", color: "#0a0a0a" } :
    verdict === "concern" ? { backgroundColor: "#FF4500", color: "#0a0a0a" } :
    verdict === "fail" ? { backgroundColor: "#FF1744", color: "#ffffff" } :
    {};
  const verdictFallback = !verdict ? "bg-gray-100 text-gray-500" : "";

  const submittedAt = latest.submitted_at ? new Date(latest.submitted_at) : null;
  const relative = submittedAt ? formatDistanceToNow(submittedAt, { addSuffix: true }) : "";

  const positionLabel = `MILESTONE ${String(milestone.position ?? 0).padStart(2, "0")} · ${(milestone.name ?? "").toUpperCase()}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-gray-300 transition-colors"
    >
      <div className="px-5 pt-4 pb-4 space-y-3">
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest truncate">
          {positionLabel}
        </p>

        <div>
          <p className="font-sans text-[15px] font-semibold text-foreground">
            {evidence.length} photo{evidence.length === 1 ? "" : "s"} submitted
          </p>
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
            {submitterName} · {relative}
          </p>
        </div>

        {photos.length > 0 && (
          <div className="flex items-center gap-2">
            {photos.map(p => (
              <div
                key={p.id}
                className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0"
              >
                <img src={p.photo_url!} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {extra > 0 && (
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[12px] text-muted-foreground">+{extra}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex">
          <span
            className={`inline-flex items-center font-mono text-[10px] uppercase tracking-[0.06em] px-2.5 py-1 rounded-full ${verdictFallback}`}
            style={verdictStyle}
          >
            AI: {verdictText}
          </span>
        </div>
      </div>

      <div className="flex border-t border-gray-200">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="flex-1 py-3 font-sans text-[13px] text-muted-foreground bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          Request more
        </button>
        <button
          onClick={onApprove}
          disabled={approving}
          className="flex-1 py-3 font-sans text-[13px] text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {approving ? "Approving…" : `Approve · £${amount.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
