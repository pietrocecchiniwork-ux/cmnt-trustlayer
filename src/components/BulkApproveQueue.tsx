import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useUpdateMilestoneStatus,
  useCreateChange,
  useCurrentUser,
  useProjectMembers,
} from "@/hooks/useSupabaseProject";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  milestones: Tables<"milestones">[];
  evidenceCounts: Record<string, number>;
  projectId: string;
  projectName: string | null;
}

/**
 * "Needs approval" queue with multi-select bulk-approve.
 * Defaults to single-tap navigation (existing behaviour); entering
 * "select" mode lets the PM tick multiple milestones and approve them
 * all in one action with a single quality assessment.
 */
export function BulkApproveQueue({ milestones, evidenceCounts, projectId, projectName }: Props) {
  const navigate = useNavigate();
  const updateStatus = useUpdateMilestoneStatus();
  const createChange = useCreateChange();
  const { data: currentUser } = useCurrentUser();
  const { data: members = [] } = useProjectMembers(projectId);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [qaPrompt, setQaPrompt] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
    setQaPrompt(false);
  };

  const selectAll = () => setSelected(new Set(milestones.map(m => m.id)));

  const approveOne = async (m: Tables<"milestones">, assessment: string) => {
    await updateStatus.mutateAsync({ id: m.id, status: "complete", projectId });

    try {
      await createChange.mutateAsync({
        project_id: projectId,
        entity_type: "milestone",
        entity_id: m.id,
        entity_name: m.name,
        change_type: "approved",
        changed_by: currentUser?.id,
        changed_by_name: currentUser?.email ?? undefined,
        new_value: { quality_assessment: assessment, bulk: true },
      });
    } catch (e) {
      console.warn("[bulk approve] change log failed:", e);
    }

    // Mark all evidence on this milestone with the QA assessment
    try {
      await supabase
        .from("evidence")
        .update({
          quality_assessment: assessment,
          verification_level: 3,
          label_dimensions_captured: 2,
        } as any)
        .eq("milestone_id", m.id);
    } catch (e) {
      console.warn("[bulk approve] evidence update failed:", e);
    }

    // Notify assigned contractor + clients
    try {
      const recipients: { email: string; name?: string }[] = [];
      const assignedUserId = (m as any).assigned_to;
      if (assignedUserId) {
        const member = members.find(x => x.user_id === assignedUserId);
        if (member?.email) recipients.push({ email: member.email, name: member.name });
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
            projectName: projectName ?? null,
            approverName: currentUser?.email?.split("@")[0] ?? null,
            paymentValue: m.payment_value ?? null,
          },
        });
      }
    } catch (e) {
      console.warn("[bulk approve] email failed:", e);
    }
  };

  const confirmBulkApprove = async (assessment: string) => {
    if (submitting || selected.size === 0) return;
    setSubmitting(true);
    setQaPrompt(false);
    const ids = Array.from(selected);
    const targets = milestones.filter(m => ids.includes(m.id));
    const results = await Promise.allSettled(targets.map(m => approveOne(m, assessment)));
    const ok = results.filter(r => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (failed === 0) {
      toast.success(`Approved ${ok} milestone${ok === 1 ? "" : "s"}`);
    } else {
      toast.error(`Approved ${ok}, failed ${failed} — check the list`);
    }
    setSubmitting(false);
    exitSelect();
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          needs approval
        </p>
        {selectMode ? (
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              disabled={submitting}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              all
            </button>
            <button
              onClick={exitSelect}
              disabled={submitting}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              cancel
            </button>
          </div>
        ) : (
          milestones.length > 1 && (
            <button
              onClick={() => setSelectMode(true)}
              className="font-mono text-[10px] text-accent hover:text-foreground"
            >
              select
            </button>
          )
        )}
      </div>

      <div className="space-y-2">
        {milestones.map(m => {
          const isSelected = selected.has(m.id);
          if (selectMode) {
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                disabled={submitting}
                className="w-full flex items-center justify-between py-3 border-b border-border text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-4 h-4 border flex items-center justify-center ${
                      isSelected
                        ? "bg-foreground border-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && (
                      <span className="font-mono text-[10px] text-background leading-none">✓</span>
                    )}
                  </span>
                  <span className="font-sans text-[14px] text-foreground">
                    {m.name?.toLowerCase()}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-accent">
                  {evidenceCounts[m.id] ?? 0} evidence
                </span>
              </button>
            );
          }
          return (
            <button
              key={m.id}
              onClick={() => navigate(`/project/milestone/${m.id}`)}
              className="w-full flex items-center justify-between py-3 border-b border-border text-left"
            >
              <span className="font-sans text-[14px] text-foreground">
                {m.name?.toLowerCase()}
              </span>
              <span className="font-mono text-[11px] text-accent">
                {evidenceCounts[m.id] ?? 0} evidence
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && !qaPrompt && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="font-mono text-[12px] text-muted-foreground">
            {selected.size} selected
          </p>
          <button
            onClick={() => setQaPrompt(true)}
            disabled={submitting}
            className="font-mono text-[12px] text-success border border-success rounded px-4 py-2 disabled:opacity-50"
          >
            approve {selected.size}
          </button>
        </div>
      )}

      {/* QA prompt for the whole batch */}
      {qaPrompt && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="font-mono text-[11px] text-muted-foreground">
            quality assessment (applied to all {selected.size})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => confirmBulkApprove("satisfactory")}
              disabled={submitting}
              className="flex-1 font-mono text-[12px] text-success border border-success rounded py-2 disabled:opacity-50"
            >
              {submitting ? "approving..." : "satisfactory"}
            </button>
            <button
              onClick={() => confirmBulkApprove("requires_attention")}
              disabled={submitting}
              className="flex-1 font-mono text-[12px] text-destructive border border-destructive rounded py-2 disabled:opacity-50"
            >
              {submitting ? "approving..." : "requires attention"}
            </button>
          </div>
          <button
            onClick={() => setQaPrompt(false)}
            disabled={submitting}
            className="font-mono text-[11px] text-muted-foreground disabled:opacity-50"
          >
            back
          </button>
        </div>
      )}
    </div>
  );
}
