import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useEvidence, useUpdateMilestoneStatus, useProjectMembers } from "@/hooks/useSupabaseProject";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-accent",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

interface MilestoneFlipCardProps {
  milestone: Tables<"milestones">;
}

export function MilestoneFlipCard({ milestone: m }: MilestoneFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const { role } = useRole();
  const { currentProjectId } = useProjectContext();

  return (
    <div
      className="w-full border-b border-border"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full transition-transform duration-300 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <div
          className="w-full"
          style={{ backfaceVisibility: "hidden" }}
        >
          <button
            onClick={() => setFlipped(true)}
            className="w-full flex items-center justify-between py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[16px] text-muted-foreground">
                {String(m.position).padStart(2, "0")}
              </span>
              <div>
                <p className="font-sans text-[14px] text-foreground">{m.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {m.due_date ?? "no date"} · £{Number(m.payment_value ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass[m.status]}`} />
          </button>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 w-full bg-background"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="relative w-full py-4 px-1">
            <button
              onClick={() => setFlipped(false)}
              className="absolute top-2 right-0 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <CardBack milestone={m} role={role} projectId={currentProjectId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBack({
  milestone: m,
  role,
  projectId,
}: {
  milestone: Tables<"milestones">;
  role: string;
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const updateStatus = useUpdateMilestoneStatus();
  const { data: evidence = [] } = useEvidence(m.id);
  const { data: members = [] } = useProjectMembers(projectId ?? undefined);
  const [reason, setReason] = useState("");
  const [rejectMode, setRejectMode] = useState(false);

  const isContractorOrTrade = role === "contractor" || role === "trade";

  // PENDING
  if (m.status === "pending") {
    return (
      <p className="font-sans text-[13px] text-muted-foreground pr-6">
        nothing required yet — starts {m.due_date ?? "tbc"}
      </p>
    );
  }

  // IN PROGRESS
  if (m.status === "in_progress") {
    if (isContractorOrTrade) {
      return (
        <Button
          variant="dark"
          size="full"
          onClick={() => navigate(`/project/camera?milestoneId=${m.id}`)}
        >
          <span className="font-sans text-[14px]">submit evidence</span>
        </Button>
      );
    }
    // PM view
    const submitters = new Set(evidence.map((e) => e.submitted_by));
    return (
      <div className="pr-6">
        <p className="font-sans text-[13px] text-muted-foreground mb-2">
          waiting for evidence submissions
        </p>
        <div className="space-y-1">
          {members
            .filter((mb) => mb.role !== "pm" && mb.role !== "client")
            .map((mb) => (
              <div key={mb.id} className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    submitters.has(mb.user_id) ? "bg-success" : "bg-muted-foreground/30"
                  }`}
                />
                <span className="font-mono text-[12px] text-foreground">{mb.name}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // OVERDUE
  if (m.status === "overdue") {
    if (isContractorOrTrade) {
      return (
        <div className="space-y-3 pr-6">
          <input
            type="text"
            placeholder="reason for delay"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="underline-input text-[13px]"
          />
          <Button
            variant="dark"
            size="full"
            disabled={!reason.trim()}
            onClick={() => navigate(`/project/camera?milestoneId=${m.id}`)}
          >
            <span className="font-sans text-[14px]">submit evidence</span>
          </Button>
        </div>
      );
    }
    // PM
    return (
      <Button
        size="full"
        className="font-sans text-[14px] text-white"
        style={{ backgroundColor: "hsl(22, 65%, 47%)" }}
        onClick={() => navigate("/project/cascade-review")}
      >
        review cascade
      </Button>
    );
  }

  // IN REVIEW
  if (m.status === "in_review") {
    if (isContractorOrTrade) {
      return (
        <p className="font-sans text-[13px] text-muted-foreground pr-6">
          evidence submitted — awaiting PM review
        </p>
      );
    }
    // PM — approve / reject
    if (rejectMode) {
      return (
        <div className="space-y-3 pr-6">
          <input
            type="text"
            placeholder="reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="underline-input text-[13px]"
          />
          <Button
            size="full"
            className="font-sans text-[14px] text-white"
            style={{ backgroundColor: "hsl(22, 65%, 47%)" }}
            disabled={!reason.trim() || updateStatus.isPending}
            onClick={async () => {
              await updateStatus.mutateAsync({
                id: m.id,
                status: "in_progress",
                projectId: m.project_id,
              });
              toast.success("milestone rejected");
              setRejectMode(false);
              setReason("");
            }}
          >
            confirm reject
          </Button>
        </div>
      );
    }
    return (
      <div className="flex gap-3 pr-6">
        <Button
          size="full"
          className="font-sans text-[14px] text-white flex-1"
          style={{ backgroundColor: "hsl(150, 33%, 36%)" }}
          disabled={updateStatus.isPending}
          onClick={async () => {
            await updateStatus.mutateAsync({
              id: m.id,
              status: "complete",
              projectId: m.project_id,
            });
            toast.success("milestone approved");
          }}
        >
          approve
        </Button>
        <Button
          size="full"
          className="font-sans text-[14px] text-white flex-1"
          style={{ backgroundColor: "hsl(22, 65%, 47%)" }}
          onClick={() => setRejectMode(true)}
        >
          reject
        </Button>
      </div>
    );
  }

  // COMPLETE
  const checklist = Array.isArray(m.checklist) ? m.checklist : [];
  return (
    <div className="pr-6 space-y-1">
      <p className="font-mono text-[12px] text-success">
        completed {m.approved_at ? new Date(m.approved_at).toLocaleDateString() : ""}
      </p>
      <p className="font-mono text-[12px] text-muted-foreground">
        {evidence.length} evidence items · {checklist.length} checklist items
      </p>
      <p className="font-mono text-[12px] text-muted-foreground">
        £{Number(m.payment_value ?? 0).toLocaleString()} {m.approved_at ? "released" : "pending"}
      </p>
    </div>
  );
}
