import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useCurrentUser } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, differenceInCalendarDays, parseISO } from "date-fns";

export default function CascadeReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { data: currentUser } = useCurrentUser();
  const [reason, setReason] = useState("");
  const [newDates, setNewDates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const overdueMilestone = milestones.find((m) => m.status === "overdue");

  const overdueDays = useMemo(() => {
    if (!overdueMilestone?.due_date) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(), parseISO(overdueMilestone.due_date)));
  }, [overdueMilestone]);

  const affectedRows = useMemo(() => {
    if (!overdueMilestone) return [];
    return milestones
      .filter((m) => m.position > overdueMilestone.position && m.due_date !== null)
      .map((m) => {
        const oldDate = m.due_date!;
        const suggested = format(addDays(parseISO(oldDate), overdueDays), "yyyy-MM-dd");
        return {
          id: m.id,
          name: m.name,
          oldDate,
          newDate: newDates[m.id] ?? suggested,
        };
      });
  }, [milestones, overdueMilestone, overdueDays, newDates]);

  const handleApprove = async () => {
    if (!reason.trim() || !currentProjectId) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      for (const row of affectedRows) {
        const { error: updateErr } = await supabase
          .from("milestones")
          .update({ due_date: row.newDate })
          .eq("id", row.id);
        if (updateErr) throw updateErr;

        const { error: shiftErr } = await supabase
          .from("milestone_shifts")
          .insert({
            milestone_id: row.id,
            old_date: row.oldDate,
            new_date: row.newDate,
            reason: reason.trim(),
            approved_by: currentUser?.id ?? null,
            approved_at: now,
          });
        if (shiftErr) throw shiftErr;
      }
      queryClient.invalidateQueries({ queryKey: ["milestones", currentProjectId] });
      toast.success("Timeline updated");
      navigate("/project/dashboard");
    } catch (err) {
      console.error("Cascade approve failed:", err);
      toast.error("Failed to update timeline");
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
      </div>
    );
  }

  if (!overdueMilestone) {
    return (
      <div className="flex flex-col h-full bg-background px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
          ← back
        </button>
        <p className="font-sans text-[16px] text-muted-foreground">no overdue milestones found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background px-6 pt-12 pb-40">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground">timeline update</h1>
      <p className="font-sans text-[16px] text-muted-foreground mt-3">
        {overdueMilestone.name} is {overdueDays} day{overdueDays !== 1 ? "s" : ""} overdue.{" "}
        {affectedRows.length} milestone{affectedRows.length !== 1 ? "s" : ""} affected.
      </p>

      <div className="divider mt-6 mb-6" />

      <div className="space-y-0">
        <div className="flex items-center py-2 border-b border-border">
          <span className="flex-1 font-mono text-[10px] text-muted-foreground">milestone</span>
          <span className="w-24 font-mono text-[10px] text-muted-foreground text-right">old</span>
          <span className="w-24 font-mono text-[10px] text-destructive text-right">new</span>
        </div>
        {affectedRows.length === 0 && (
          <p className="font-sans text-[14px] text-muted-foreground py-4">
            no downstream milestones with dates to shift
          </p>
        )}
        {affectedRows.map((row) => (
          <div key={row.id} className="flex items-center py-3 border-b border-border">
            <span className="flex-1 font-sans text-[14px] text-foreground">{row.name}</span>
            <span className="w-24 font-mono text-[11px] text-muted-foreground text-right line-through decoration-border">
              {format(parseISO(row.oldDate), "dd MMM yyyy")}
            </span>
            <div className="w-24 flex justify-end">
              <input
                type="date"
                value={row.newDate}
                onChange={(e) =>
                  setNewDates((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                className="font-mono text-[11px] text-destructive bg-transparent border-none outline-none text-right w-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <input
          type="text"
          placeholder="reason for delay — required"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="underline-input"
        />
      </div>

      {/* Fixed approve button above bottom nav */}
      <div
        className="fixed bottom-16 left-0 right-0 px-6 bg-background"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
      >
        <Button
          variant="dark"
          size="full"
          disabled={!reason.trim() || saving}
          onClick={handleApprove}
        >
          <span className="font-sans text-[16px]">
            {saving ? "updating..." : "approve revised dates"}
          </span>
        </Button>
      </div>
    </div>
  );
}
