import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { usePaymentCertificates, useMilestones, useProject } from "@/hooks/useSupabaseProject";
import { exportPaymentCertificates, type DateRange } from "@/lib/exportCsv";
import { useRole } from "@/contexts/RoleContext";
import { CsvExportButton } from "@/components/CsvExportButton";

export default function PaymentsList() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: certificates = [], isLoading } = usePaymentCertificates(currentProjectId ?? undefined);
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { role } = useRole();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExportCsv = (range: DateRange) => {
    const enriched = certificates.map(c => ({
      ...c,
      milestone_name: milestones.find(m => m.id === c.milestone_id)?.name ?? "",
    }));
    exportPaymentCertificates(enriched, project?.name ?? "project", range);
  };

  const totalReleased = milestones
    .filter(m => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  const totalBudget = milestones
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  const releasedPct = totalBudget === 0 ? 0 : Math.round((totalReleased / totalBudget) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        {/* Header + summary */}
        <div className="px-6 pt-20 pb-6 space-y-3">
          <div className="bg-card rounded-3xl px-6 py-5">
            <div className="flex items-baseline justify-between">
              <p className="t-eyebrow">payments</p>
              {(role === "pm" || role === "client") && certificates.length > 0 && (
                <CsvExportButton
                  onExport={handleExportCsv}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-4"
                />
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="t-eyebrow">total budget</p>
                <p className="font-sans text-[28px] tracking-[-0.02em] text-foreground mt-1 leading-none">
                  £{totalBudget.toLocaleString()}
                </p>
              </div>

              <div className="h-px bg-border/60" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="t-eyebrow">released</p>
                  <p className="font-sans text-[22px] tracking-[-0.02em] mt-1 leading-none" style={{ color: "#39FF14" }}>
                    £{totalReleased.toLocaleString()}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1.5">
                    {releasedPct}% of budget
                  </p>
                </div>
                <div>
                  <p className="t-eyebrow">remaining</p>
                  <p className="font-sans text-[22px] tracking-[-0.02em] text-foreground mt-1 leading-none">
                    £{(totalBudget - totalReleased).toLocaleString()}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1.5">
                    across {milestones.filter(m => m.status !== "complete").length} milestones
                  </p>
                </div>
              </div>

              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all rounded-full"
                  style={{ width: `${releasedPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="px-6">
            <div className="bg-card rounded-3xl px-6 py-5">
              <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
            </div>
          </div>
        )}

        {/* Payment cards */}
        <div className="flex-1 px-6 pb-6 space-y-3">
          {milestones.map((m) => {
            const isReleased = m.status === "complete";
            const isExpanded = expandedId === m.id;
            const cert = certificates.find((c: any) => c.milestone_id === m.id);
            return (
              <div key={m.id} className={`rounded-3xl px-6 py-4 transition-colors ${isExpanded ? "bg-card" : "bg-card/40 hover:bg-card/60"}`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-sans text-[14px] text-foreground truncate lowercase">
                      {m.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      £{Number(m.payment_value ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 ${
                    isReleased ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                  }`}>
                    {isReleased ? "released" : "pending"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="t-eyebrow">amount</p>
                        <p className="font-sans text-[14px] text-foreground mt-1">
                          £{Number(m.payment_value ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="t-eyebrow">status</p>
                        <p className="font-sans text-[14px] text-foreground mt-1 lowercase">
                          {isReleased ? "released" : (m.status ?? "pending").replace(/_/g, " ")}
                        </p>
                      </div>
                      <div>
                        <p className="t-eyebrow">due date</p>
                        <p className="font-sans text-[14px] text-foreground mt-1">{m.due_date ?? "—"}</p>
                      </div>
                      <div>
                        <p className="t-eyebrow">assigned</p>
                        <p className="font-sans text-[14px] text-foreground mt-1 truncate">
                          {(m as any).assigned_to_name ?? "unassigned"}
                        </p>
                      </div>
                    </div>
                    {isReleased && (
                      <button
                        onClick={() => navigate(`/project/payment-certificate/${m.id}`)}
                        className="w-full py-3 bg-foreground text-background rounded-full font-sans text-[14px]"
                      >
                        view certificate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {milestones.length === 0 && !isLoading && (
            <div className="bg-card rounded-3xl px-6 py-8">
              <p className="font-mono text-[13px] text-muted-foreground text-center">no milestones yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
